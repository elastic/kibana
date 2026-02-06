/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import type { ToolRunnableConfig } from '@langchain/core/tools';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { ToolMessage } from '@langchain/core/messages';
import { Command, getCurrentTaskInput } from '@langchain/langgraph';
import { z } from '@kbn/zod';
import type { estypes } from '@elastic/elasticsearch';
import type { JsonObject, JsonValue } from '@kbn/utility-types';

import type { AutomaticImportAgentState } from '../state';

const collectKeysWithSamples = (
  value: JsonValue,
  uniqueKeySamples: Map<string, JsonValue>,
  prefix = ''
): void => {
  const storeSample = (key: string, sampleValue: JsonValue) => {
    const formattedSample = formatSample(sampleValue);
    const existingSample = uniqueKeySamples.get(key);

    if (typeof formattedSample === 'string') {
      if (formattedSample !== '') {
        uniqueKeySamples.set(key, formattedSample);
      } else if (existingSample === undefined) {
        uniqueKeySamples.set(key, '');
      }
      return;
    }

    if (existingSample === undefined) {
      uniqueKeySamples.set(key, formattedSample);
    }
  };

  if (value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectKeysWithSamples(item, uniqueKeySamples, prefix));
    return;
  }

  if (typeof value === 'object') {
    Object.entries(value as JsonObject).forEach(([key, val]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      storeSample(nextPrefix, val);
      collectKeysWithSamples(val, uniqueKeySamples, nextPrefix);
    });
    return;
  }

  if (prefix) {
    storeSample(prefix, value);
  }
};

const formatSample = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.length > 0 ? formatSample(value[0]) : [];
  }

  if (typeof value === 'object' && value !== null) {
    return value;
  }

  return value ?? '';
};

const extractSource = (result: estypes.IngestSimulateDocumentResult): JsonObject => {
  const source = result.doc?._source;
  if (source === undefined || source === null) return {};
  if (typeof source !== 'object' || Array.isArray(source)) return {};
  return source as JsonObject;
};

export function fetchUniqueKeysTool(): DynamicStructuredTool {
  const schema = z.object({});

  return new DynamicStructuredTool({
    name: 'fetch_unique_keys',
    description:
      'Retrieves processed documents from pipeline_generation_results stored in state. Use this to gather a subset ' +
      'of recent pipeline outputs for downstream ECS mapping tasks.',
    schema,
    func: async (
      input: z.infer<typeof schema>,
      _runManager?: CallbackManagerForToolRun,
      config?: ToolRunnableConfig
    ) => {
      const state = getCurrentTaskInput<z.infer<typeof AutomaticImportAgentState>>();
      const docs = state.pipeline_generation_results;

      if (docs.length === 0) {
        return new Command({
          update: {
            messages: [
              new ToolMessage({
                content: JSON.stringify({ unique_keys: {} }),
                tool_call_id: config?.toolCall?.id as string,
              }),
            ],
          },
        });
      }

      const uniqueKeySamples = new Map<string, JsonValue>();
      docs.forEach((doc) => {
        const source = extractSource(doc);
        collectKeysWithSamples(source, uniqueKeySamples);
      });

      const uniqueKeysObject = Array.from(uniqueKeySamples.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .reduce<Record<string, JsonValue>>((acc, [key, sample]) => {
          acc[key] = sample;
          return acc;
        }, {});

      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: JSON.stringify({ unique_keys: uniqueKeysObject }),
              tool_call_id: config?.toolCall?.id as string,
            }),
          ],
        },
      });
    },
  });
}
