/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseStepDefinition } from '@kbn/workflows';
import {
  buildOutputSummary,
  buildStepParamsSummary,
  StepCategory,
} from '@kbn/workflows';

export interface StepDefinitionForAgent {
  id: string;
  label: string;
  description?: string;
  category: string;
  connectorId?: 'required' | 'optional' | 'none';
  inputParams?: unknown;
  configParams?: unknown;
  outputSummary?: string;
  examples?: string[];
}

const MAX_DESCRIPTION_LENGTH = 200;

export function truncateDescription(text: string | null | undefined): string | undefined {
  if (!text) return undefined;
  if (text.length <= MAX_DESCRIPTION_LENGTH) return text;
  return `${text.slice(0, MAX_DESCRIPTION_LENGTH)}...`;
}

export function categorizeConnectorType(type: string): string {
  if (type.startsWith('kibana.')) return StepCategory.Kibana;
  if (type.startsWith('cases.')) return StepCategory.KibanaCases;
  if (type.startsWith('elasticsearch.')) return StepCategory.Elasticsearch;
  if (type.startsWith('ai.')) return StepCategory.Ai;
  if (type.startsWith('data.')) return StepCategory.Data;
  return StepCategory.External;
}

export function formatBuiltInStep(step: BaseStepDefinition): StepDefinitionForAgent {
  const inputParams = buildStepParamsSummary(step.inputSchema);
  const configParams = step.configSchema ? buildStepParamsSummary(step.configSchema) : undefined;
  const outputSummary = buildOutputSummary(step.outputSchema);

  return {
    id: step.id,
    label: step.label,
    description: step.description,
    category: step.category,
    connectorId: 'none',
    ...(inputParams.length > 0 ? { inputParams } : {}),
    ...(configParams && configParams.length > 0 ? { configParams } : {}),
    ...(outputSummary ? { outputSummary } : {}),
    examples: step.documentation?.examples,
  };
}
