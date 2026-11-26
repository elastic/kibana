/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepDecoration, StepSummary } from '../types';

export interface JsonLineMap {
  [stepId: string]: {
    lineStart: number;
    lineEnd: number;
  };
}

interface JsonLineMapOptions {
  includeEmptyProcessors?: boolean;
}

export const GENERATED_PROCESSOR_STEP_ID_PREFIX = '__streams_ui.';

export const getGeneratedProcessorStepId = (processorIndex: number): string =>
  `${GENERATED_PROCESSOR_STEP_ID_PREFIX}root.steps[${processorIndex}]`;

export const isGeneratedProcessorStepId = (stepId: string): boolean => {
  return (
    stepId.startsWith(GENERATED_PROCESSOR_STEP_ID_PREFIX) ||
    /^root\.steps\[\d+\]$/.test(stepId) ||
    /^processor-\d+$/.test(stepId)
  );
};

interface ObjectRange {
  start: number;
  end: number;
  source: string;
}

/**
 * Parse JSON string and map each top-level processor's tag to its line range.
 * Uses a lightweight scanner instead of an AST dependency so the editor package
 * does not need an additional runtime dependency just for source ranges.
 */
export function mapStepsToJsonLines(
  jsonString: string,
  options: JsonLineMapOptions = {}
): JsonLineMap {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      return {};
    }
  } catch {
    return {};
  }

  const finalLineMap: JsonLineMap = {};
  const processorRanges = getTopLevelArrayObjectRanges(jsonString);

  processorRanges.forEach((processorRange, index) => {
    const stepId = getProcessorStepId(processorRange.source, index, options);
    if (!stepId) {
      return;
    }

    const startLine = offsetToLine(jsonString, processorRange.start);
    const endLine = offsetToLine(jsonString, processorRange.end);
    finalLineMap[stepId] = { lineStart: startLine, lineEnd: endLine };
  });

  return finalLineMap;
}

const offsetToLine = (value: string, offset: number): number =>
  value.substring(0, offset).split('\n').length;

const getTopLevelArrayObjectRanges = (jsonString: string): ObjectRange[] => {
  const ranges: ObjectRange[] = [];
  let arrayDepth = 0;
  let objectDepth = 0;
  let inString = false;
  let isEscaped = false;
  let objectStart: number | undefined;

  for (let index = 0; index < jsonString.length; index++) {
    const char = jsonString[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === '\\') {
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '[') {
      arrayDepth++;
      continue;
    }

    if (char === ']') {
      arrayDepth--;
      continue;
    }

    if (char === '{') {
      if (arrayDepth === 1 && objectDepth === 0) {
        objectStart = index;
      }
      objectDepth++;
      continue;
    }

    if (char === '}') {
      objectDepth--;
      if (arrayDepth === 1 && objectDepth === 0 && objectStart !== undefined) {
        ranges.push({
          start: objectStart,
          end: index + 1,
          source: jsonString.slice(objectStart, index + 1),
        });
        objectStart = undefined;
      }
    }
  }

  return ranges;
};

const getProcessorStepId = (
  processorSource: string,
  processorIndex: number,
  options: JsonLineMapOptions
): string | undefined => {
  try {
    const processor = JSON.parse(processorSource) as Record<string, unknown>;
    const [processorType] = Object.keys(processor);
    const processorConfig = processorType ? processor[processorType] : undefined;

    if (!processorConfig || typeof processorConfig !== 'object') {
      return undefined;
    }

    const tag = (processorConfig as Record<string, unknown>).tag;
    if (typeof tag === 'string' && tag.length > 0) {
      return isGeneratedProcessorStepId(tag) ? getGeneratedProcessorStepId(processorIndex) : tag;
    }

    if (!options.includeEmptyProcessors && Object.keys(processorConfig).length === 0) {
      return undefined;
    }

    return getGeneratedProcessorStepId(processorIndex);
  } catch {
    return undefined;
  }
};

/**
 * Convert step summary (status map) to Monaco decorations using the line map
 */
export function getStepDecorations(
  stepSummary: StepSummary,
  jsonLineMap: JsonLineMap
): StepDecoration[] {
  const decorations: StepDecoration[] = [];

  if (!stepSummary || stepSummary.size === 0) {
    return decorations;
  }

  // Iterate through each step in the summary
  stepSummary.forEach((processingStatus, stepId) => {
    const lineInfo = jsonLineMap[stepId];

    if (!lineInfo) {
      return;
    }

    decorations.push({
      stepId,
      lineStart: lineInfo.lineStart,
      lineEnd: lineInfo.lineEnd,
      status: processingStatus,
    });
  });

  return decorations;
}
