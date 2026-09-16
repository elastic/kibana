/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformSignificantEventsTools } from '@kbn/agent-builder-common';
import { isRecord, isToolId, memoryToolIds, type OrderedToolCall } from './tool_usage';

const TOOL_ID_MEMORY_READ = memoryToolIds.memoryRead;
const { eventsWrite: TOOL_ID_EVENTS_WRITE } = platformSignificantEventsTools;

const NOISE_ON_LINE = /dismissed|false[-\s]?positive|expected noise/i;

const collectMemoryReadBodies = (calls: OrderedToolCall[]): string[] => {
  const bodies: string[] = [];
  for (const { results, toolId } of calls) {
    if (!isToolId(toolId, TOOL_ID_MEMORY_READ)) {
      continue;
    }
    for (const result of results) {
      if (!isRecord(result) || !isRecord(result.data) || typeof result.data.content !== 'string') {
        continue;
      }
      bodies.push(result.data.content);
    }
  }
  return bodies;
};

/** History bullet already records this rule as dismissed / known FP / expected noise. */
export const isAlreadyRecordedNoise = (content: string, ruleUuid: string): boolean =>
  content.split('\n').some((line) => line.includes(ruleUuid) && NOISE_ON_LINE.test(line));

export const alreadyRecordedNoiseUuids = (
  calls: OrderedToolCall[],
  inputRuleUuids: string[]
): Set<string> => {
  const bodies = collectMemoryReadBodies(calls);
  const joined = bodies.join('\n');
  return new Set(
    inputRuleUuids.filter((uuid) => uuid.length > 0 && isAlreadyRecordedNoise(joined, uuid))
  );
};

export const eventWriteSignalRuleUuids = (calls: OrderedToolCall[]): Set<string> => {
  const uuids = new Set<string>();
  for (const { params, toolId } of calls) {
    if (!isToolId(toolId, TOOL_ID_EVENTS_WRITE) || !Array.isArray(params.items)) {
      continue;
    }
    for (const item of params.items) {
      if (!isRecord(item) || !Array.isArray(item.signals)) {
        continue;
      }
      for (const signal of item.signals) {
        if (!isRecord(signal) || !isRecord(signal.metadata)) {
          continue;
        }
        if (typeof signal.metadata.rule_uuid === 'string') {
          uuids.add(signal.metadata.rule_uuid);
        }
      }
    }
  }
  return uuids;
};
