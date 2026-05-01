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
  isInternalConnector,
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
  return `${text.slice(0, MAX_DESCRIPTION_LENGTH)}…`;
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
 * `summary` / `description` pair.
 *
 * - For most contracts (`elasticsearch.indices.create`, …) `summary` is short
 *   and `description` is long. For workflows-extension registered step
 *   definitions, `getRegisteredStepDefinitions` inverts that. Picking by
 *   length gives a stable result for both shapes.
 *
 * - For auto-generated `InternalConnectorContract`s (every `elasticsearch.*`
 *   and `kibana.*` API contract) the description is OpenAPI reference docs —
 *   multi-paragraph, HTML-laden, full of "Spaces method and path" preambles.
 *   None of that is useful for the agent at planning time, so we drop it
 *   entirely. The agent can call `get_step_definitions` for the schema if
 *   it needs more.
 */
export const pickLabelAndDescription = (
  connector: ConnectorContractUnion
): { label: string; description?: string } => {
  const a = connector.summary ?? null;
  const b = connector.description ?? null;
  const fallback = connector.type;
  if (!a && !b) return { label: fallback };
  if (!a) return { label: b! };
  if (!b) return { label: a };
  const [shortText, longText] = a.length <= b.length ? [a, b] : [b, a];
  if (isInternalConnector(connector) || shortText === longText) {
    return { label: shortText };
  }
  return { label: shortText, description: truncateDescription(longText) };
};

export function formatConnectorStep(connector: ConnectorContractUnion): StepDefinitionForAgent {
  const connectorId = connector.hasConnectorId || 'none';
  const inputParams = buildStepParamsSummary(connector.paramsSchema);
  const configParams = connector.configSchema
    ? buildStepParamsSummary(connector.configSchema)
    : undefined;
  const outputSummary = buildOutputSummary(connector.outputSchema);
  const { label, description } = pickLabelAndDescription(connector);

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
