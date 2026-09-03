/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep } from '@kbn/evals';
import { identifiedFeatureSchema, ignoredFeatureSchema } from '@kbn/significant-events-schema';
import type { BaseFeature, IgnoredFeature } from '@kbn/significant-events-schema';
import { platformSignificantEventsTools } from '@kbn/agent-builder-common/tools';
import { isToolId } from '../discovery/utils/tool_usage';

const MAX_EVIDENCE_ITEMS = 5;
const FINALIZE_TOOL_ID = platformSignificantEventsTools.finalizeFeatures;

function tryParseCondition(maybeFilter: unknown): unknown {
  if (!maybeFilter || typeof maybeFilter !== 'object') return undefined;
  return maybeFilter;
}

export function parseFeaturesFromSteps(
  steps: ConverseStep[],
  streamName: string
): { features: BaseFeature[]; ignoredFeatures: IgnoredFeature[] } {
  const finalizeStep = steps.find(
    (s) =>
      s.type === 'tool_call' &&
      typeof s.tool_id === 'string' &&
      isToolId(s.tool_id, FINALIZE_TOOL_ID)
  );

  if (!finalizeStep || !finalizeStep.params) {
    return { features: [], ignoredFeatures: [] };
  }

  const raw = finalizeStep.params as { features?: unknown; ignored_features?: unknown };
  const features: BaseFeature[] = [];
  const ignoredFeatures: IgnoredFeature[] = [];

  for (const item of Array.isArray(raw.features) ? raw.features : []) {
    const candidate = {
      ...(item as Record<string, unknown>),
      stream_name: streamName,
      filter: tryParseCondition((item as Record<string, unknown>).filter),
      ...(Array.isArray((item as Record<string, unknown>).evidence)
        ? {
            evidence: ((item as Record<string, unknown>).evidence as unknown[]).slice(
              0,
              MAX_EVIDENCE_ITEMS
            ),
          }
        : {}),
    };
    const result = identifiedFeatureSchema.safeParse(candidate);
    if (result.success && Object.keys(result.data.properties).length > 0) {
      features.push(result.data);
    }
  }

  for (const item of Array.isArray(raw.ignored_features) ? raw.ignored_features : []) {
    const result = ignoredFeatureSchema.safeParse(item);
    if (result.success) {
      ignoredFeatures.push(result.data);
    }
  }

  return { features, ignoredFeatures };
}
