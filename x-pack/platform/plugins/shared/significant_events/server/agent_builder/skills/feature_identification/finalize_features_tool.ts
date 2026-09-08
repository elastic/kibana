/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { featureIdentificationOutputSchema } from '../../../lib/significant_events/features/feature_identification_output';

export const FINALIZE_FEATURES_TOOL_ID = 'platform_sig_events_ki_feature_finalize';

export const finalizeFeaturesTool = {
  id: FINALIZE_FEATURES_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Submit the complete deduplicated feature list exactly once after grounding and duplicate checks. After this succeeds, respond with a brief confirmation and do not repeat the features.',
  schema: featureIdentificationOutputSchema,
  handler: async () => ({
    results: [{ type: ToolResultType.other, data: { finalized: true } }],
  }),
} satisfies BuiltinSkillBoundedTool<typeof featureIdentificationOutputSchema>;
