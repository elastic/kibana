/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep } from '@kbn/evals';
import type { BaseFeature, IgnoredFeature } from '@kbn/significant-events-schema';
import { parseFinalizedFeatures } from '@kbn/significant-events-plugin/server';
import { platformSignificantEventsTools } from '@kbn/agent-builder-common/tools';
import { isToolId } from '../discovery/utils/tool_usage';

const FINALIZE_TOOL_ID = platformSignificantEventsTools.finalizeFeatures;

export function parseFeaturesFromSteps(
  steps: ConverseStep[],
  streamName: string
): { features: BaseFeature[]; ignoredFeatures: IgnoredFeature[] } {
  const finalizeStep = steps.find(
    (step) =>
      step.type === 'tool_call' &&
      typeof step.tool_id === 'string' &&
      isToolId(step.tool_id, FINALIZE_TOOL_ID)
  );

  if (!finalizeStep || !finalizeStep.params) {
    return { features: [], ignoredFeatures: [] };
  }

  return parseFinalizedFeatures(
    finalizeStep.params as { features?: unknown; ignored_features?: unknown },
    streamName
  );
}
