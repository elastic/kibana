/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import YAML from 'yaml';
import type { StreamlangDSL, StreamlangStep } from '@kbn/streamlang/types/streamlang';
import { addIdentifierToStep, isConditionBlock } from '@kbn/streamlang';
import type { StepDecoration, StepSummary } from '../types';

export interface YamlLineMap {
  [stepId: string]: {
    lineStart: number;
    lineEnd: number;
  };
}

/**
 * Parse YAML string and map each step's deterministic customIdentifier to its line ranges.
 * Since customIdentifiers are stripped from the YAML before rendering, we regenerate them
 * using the same deterministic approach as addStepIdentifiers (content hash + path).
 */
export function mapStepsToYamlLines(yamlString: string): YamlLineMap {
  try {
    // Parse the YAML with source tokens to get ranges
    const doc = YAML.parseDocument(yamlString, { keepSourceTokens: true });

    // Also parse to get the actual DSL structure
    const parsedDSL = YAML.parse(yamlString) as StreamlangDSL;

    if (!parsedDSL || !parsedDSL.steps) {
      return {};
    }

    const finalLineMap: YamlLineMap = {};

    // Get the steps array node from the document
    const stepsNode = doc.getIn(['steps' as any]) as any;

    if (!stepsNode || !stepsNode.items) {
      return finalLineMap;
    }

    // Helper function to recursively process steps
    function processSteps(
      stepNodes: any[],
      dslSteps: StreamlangStep[],
      lineMap: YamlLineMap,
      yamlValue: string,
      path: string = 'root'
    ) {
      stepNodes.forEach((stepNode: any, index: number) => {
        if (!stepNode.range) {
          return;
        }

        const dslStep = dslSteps[index];
        if (!dslStep) {
          return;
        }

        // Calculate line numbers from range
        const [start, end] = stepNode.range;
        const startLine = yamlValue.substring(0, start).split('\n').length;
        // Adjust end position to not include trailing newline
        const adjustedEnd = end > 0 && yamlValue[end - 1] === '\n' ? end - 1 : end;
        const endLine = yamlValue.substring(0, adjustedEnd).split('\n').length;

        const { stepPath, step } = addIdentifierToStep(dslStep, path, index);

        lineMap[step.customIdentifier!] = {
          lineStart: startLine,
          lineEnd: endLine,
        };

        // Handle nested condition blocks recursively
        if (isConditionBlock(dslStep) && dslStep.condition?.steps) {
          const conditionNode = stepNode.get && stepNode.get('condition');
          const nestedStepsNode = conditionNode && conditionNode.get && conditionNode.get('steps');

          if (nestedStepsNode && nestedStepsNode.items) {
            processSteps(
              nestedStepsNode.items,
              dslStep.condition.steps,
              lineMap,
              yamlValue,
              stepPath
            );
          }
        }
      });
    }

    processSteps(stepsNode.items, parsedDSL.steps, finalLineMap, yamlString);

    return finalLineMap;
  } catch (error) {
    return {};
  }
}

/**
 * Convert step summary (status map) to Monaco decorations using the line map
 */
export function getStepDecorations(
  stepSummary: StepSummary,
  yamlLineMap: YamlLineMap
): StepDecoration[] {
  const decorations: StepDecoration[] = [];

  if (!stepSummary || stepSummary.size === 0) {
    return decorations;
  }

  // Iterate through each step in the summary
  stepSummary.forEach((processingStatus, stepId) => {
    const lineInfo = yamlLineMap[stepId];

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
