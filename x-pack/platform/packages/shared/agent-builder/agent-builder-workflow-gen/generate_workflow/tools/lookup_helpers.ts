/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseStepDefinition, ConnectorContractUnion } from '@kbn/workflows';
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

/**
 * Pick the short label and the long description from a connector's
 * `summary` / `description` pair. Most contracts follow `summary=short` /
 * `description=long` (e.g. `elasticsearch.indices.create`), but workflows-
 * extension registered step definitions have these inverted by
 * `getRegisteredStepDefinitions`. Picking by length gives a stable result
 * for both shapes.
 */
const pickLabelAndDescription = (
  summary: string | null | undefined,
  description: string | null | undefined,
  fallback: string
): { label: string; description?: string } => {
  const a = summary ?? null;
  const b = description ?? null;
  if (!a && !b) return { label: fallback };
  if (!a) return { label: b! };
  if (!b) return { label: a };
  const [shortText, longText] = a.length <= b.length ? [a, b] : [b, a];
  return {
    label: shortText,
    description: shortText === longText ? undefined : truncateDescription(longText),
  };
};

export function formatConnectorStep(connector: ConnectorContractUnion): StepDefinitionForAgent {
  const connectorId = connector.hasConnectorId || 'none';
  const inputParams = buildStepParamsSummary(connector.paramsSchema);
  const configParams = connector.configSchema
    ? buildStepParamsSummary(connector.configSchema)
    : undefined;
  const outputSummary = buildOutputSummary(connector.outputSchema);
  const { label, description } = pickLabelAndDescription(
    connector.summary,
    connector.description,
    connector.type
  );

  return {
    id: connector.type,
    label,
    description,
    category: categorizeConnectorType(connector.type),
    connectorId,
    ...(inputParams.length > 0 ? { inputParams } : {}),
    ...(configParams && configParams.length > 0 ? { configParams } : {}),
    ...(outputSummary ? { outputSummary } : {}),
    examples: connector.examples?.snippet ? [connector.examples.snippet] : undefined,
  };
}

export { pickLabelAndDescription };
