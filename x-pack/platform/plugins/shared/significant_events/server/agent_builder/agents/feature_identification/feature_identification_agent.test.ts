/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformSignificantEventsTools } from '@kbn/agent-builder-common/tools';
import { isAllowedBuiltinTool } from '@kbn/agent-builder-server/allow_lists';
import { platformStreamsMemoryTools } from '../../../memory_and_investigation/tools/memory/tool_ids';
import { featureIdentificationAgentType } from './feature_identification_agent';

describe('featureIdentificationAgentType', () => {
  it('exposes only parity-required tools', () => {
    const toolIds = [
      platformStreamsMemoryTools.memorySearch,
      platformStreamsMemoryTools.memoryRead,
      platformStreamsMemoryTools.memoryList,
      platformSignificantEventsTools.searchSimilarFeatures,
      platformSignificantEventsTools.searchEvent,
      platformSignificantEventsTools.finalizeFeatures,
    ];

    expect(featureIdentificationAgentType.baseConfiguration.skill_ids).toEqual([]);
    expect(featureIdentificationAgentType.baseConfiguration.tools).toEqual([{ tool_ids: toolIds }]);
    expect(toolIds.every(isAllowedBuiltinTool)).toBe(true);
  });

  it('includes grounding instructions', () => {
    const { instructions } = featureIdentificationAgentType.baseConfiguration;

    expect(instructions).toContain('call `platform_sig_events_memory_search` at least once');
    expect(instructions).toContain('`platform_sig_events_event_search`');
    expect(instructions).toContain('`platform_sig_events_ki_feature_similarity_search`');
    expect(instructions).toContain('call `platform_sig_events_ki_feature_finalize` exactly once');
  });
});
