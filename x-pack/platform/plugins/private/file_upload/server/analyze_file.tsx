/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import {
  NdjsonReader,
  MessageReader,
  TikaReader,
  FILE_FORMATS,
  updatePipelineTimezone,
} from '@kbn/file-upload-common';
import type {
  AnalysisResult,
  FormattedOverrides,
  InputData,
  InputOverrides,
} from '@kbn/file-upload-common';
import type {
  IngestDocumentSimulation,
  IngestSimulateResponse,
  TextStructureFindStructureResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { cloneDeep } from 'lodash';

const PREVIEW_DOC_LIMIT = 20;

export async function analyzeFile(
  client: IScopedClusterClient,
  logger: Logger,
  data: InputData,
  overrides: InputOverrides,
  includePreview: boolean
): Promise<AnalysisResult> {
  overrides.explain = overrides.explain === undefined ? 'true' : overrides.explain;
  const results = await client.asInternalUser.textStructure.findStructure(
    {
      body: data,
      ecs_compatibility: 'v1',
      ...overrides,
    },
    { maxRetries: 0 }
  );

  const { hasOverrides, reducedOverrides } = formatOverrides(overrides);

  let previewDocs: IngestSimulateResponse | undefined;

  if (includePreview) {
    try {
      const pipeline = cloneDeep(results.ingest_pipeline);
      updatePipelineTimezone(pipeline);
      const reader = getReader(results);
      const arrayBuffer = new Uint8Array(Buffer.from(data));
      const docs = reader.read(arrayBuffer).slice(0, PREVIEW_DOC_LIMIT);
      if (results.format === FILE_FORMATS.NDJSON) {
        previewDocs = {
          docs: docs.map((doc: any) => ({
            doc: {
              _id: '',
              _index: '',
              _source: JSON.parse(doc),
            } as IngestDocumentSimulation,
          })),
        };
      } else {
        previewDocs = await client.asInternalUser.ingest.simulate({
          pipeline,
          docs: docs.map((doc: any) => {
            return {
              _source: doc,
            };
          }),
        });
      }
    } catch (error) {
      // preview failed, just log the error
      logger.warn(`Unable to generate preview documents, error: ${error.message}`);
    }
  }

  return {
    ...(hasOverrides && { overrides: reducedOverrides }),
    // @ts-expect-error type incompatible with FindFileStructureResponse
    results,
    preview: previewDocs,
  };
}

function formatOverrides(overrides: InputOverrides) {
  let hasOverrides = false;

  const reducedOverrides: FormattedOverrides = Object.keys(overrides).reduce((acc, overrideKey) => {
    const overrideValue: string | undefined = overrides[overrideKey];
    if (overrideValue !== undefined && overrideValue !== '') {
      if (overrideKey === 'column_names') {
        acc.column_names = overrideValue.split(',');
      } else if (overrideKey === 'has_header_row') {
        acc.has_header_row = overrideValue === 'true';
      } else if (overrideKey === 'should_trim_fields') {
        acc.should_trim_fields = overrideValue === 'true';
      } else {
        acc[overrideKey] = overrideValue;
      }

      hasOverrides = true;
    }
    return acc;
  }, {} as FormattedOverrides);

  return {
    reducedOverrides,
    hasOverrides,
  };
}

function getReader(results: TextStructureFindStructureResponse) {
  switch (results.format) {
    case FILE_FORMATS.NDJSON:
      return new NdjsonReader();
    case FILE_FORMATS.SEMI_STRUCTURED_TEXT:
    case FILE_FORMATS.DELIMITED:
      const options: {
        docLimit?: number;
        excludeLinesPattern?: string;
        multilineStartPattern?: string;
      } = {};
      if (results.exclude_lines_pattern !== undefined) {
        options.excludeLinesPattern = results.exclude_lines_pattern;
      }
      if (results.multiline_start_pattern !== undefined) {
        options.multilineStartPattern = results.multiline_start_pattern;
      }
      return new MessageReader(options);
    case FILE_FORMATS.TIKA:
      return new TikaReader();
    default:
      throw new Error(`Unknown format: ${results.format}`);
  }
}
