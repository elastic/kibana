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

const MAX_DESCRIPTION_LENGTH = 150;

const cleanDescription = (text: string): string =>
  text
    // Strip HTML tags (Kibana OpenAPI-derived descriptions embed <div>, <span>, …).
    .replace(/<[^>]+>/g, ' ')
    // Strip a leading markdown-bold preamble like "**Spaces method and path…**".
    .replace(/^\s*\*\*[^*]+\*\*\s*/, '')
    // Collapse any whitespace run (including \n\n paragraph breaks) into one space.
    .replace(/\s+/g, ' ')
    .trim();

export function truncateDescription(text: string | null | undefined): string | undefined {
  if (!text) return undefined;
  const cleaned = cleanDescription(text);
  if (!cleaned) return undefined;
  if (cleaned.length <= MAX_DESCRIPTION_LENGTH) return cleaned;
  // Prefer cutting at the first full sentence boundary if it falls within the budget.
  const firstSentence = cleaned.match(/^.{20,}?[.!?](?=\s|$)/);
  if (firstSentence && firstSentence[0].length <= MAX_DESCRIPTION_LENGTH) {
    return firstSentence[0];
  }
  return `${cleaned.slice(0, MAX_DESCRIPTION_LENGTH)}…`;
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
const normalizeForCompare = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

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
  if (shortText === longText) return { label: shortText };
  const truncated = truncateDescription(longText);
  if (!truncated) return { label: shortText };
  // Drop the description when it just restates the label (common for
  // OpenAPI-derived contracts where the description starts with the title
  // before launching into reference docs we already trimmed away).
  const nLabel = normalizeForCompare(shortText);
  const nDesc = normalizeForCompare(truncated);
  if (nDesc === nLabel || nDesc.startsWith(nLabel)) {
    return { label: shortText };
  }
  return { label: shortText, description: truncated };
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
