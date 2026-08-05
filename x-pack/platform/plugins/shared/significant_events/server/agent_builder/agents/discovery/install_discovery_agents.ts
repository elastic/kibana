/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import {
  SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID,
  SIGNIFICANT_EVENTS_DISCOVERY_AGENT_TYPE_ID,
} from './discovery';
import { SIGNIFICANT_EVENTS_JUDGE_AGENT_ID, SIGNIFICANT_EVENTS_JUDGE_AGENT_TYPE_ID } from './judge';

/**
 * Installs the system-owned, user-editable discovery and judge agent profiles in
 * the target space. Idempotent — does not overwrite existing agents or later user edits.
 */
export const installDiscoveryAgents = async ({
  agentBuilder,
  spaceId,
}: {
  agentBuilder: AgentBuilderPluginStart;
  spaceId: string;
}): Promise<void> => {
  await Promise.all([
    agentBuilder.agents.ensure({
      spaceId,
      agent: {
        id: SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID,
        type: SIGNIFICANT_EVENTS_DISCOVERY_AGENT_TYPE_ID,
        name: 'Significant Events Discovery',
        description:
          'Triages statistical detection signals across rules, correlates related detections into incident candidates using shared infrastructure, temporal proximity, and causal plausibility, and drafts structured discovery documents with root-cause hypotheses and supporting evidence.',
        labels: ['observability', 'streams', 'significant-events', 'discovery'],
        avatar_symbol: 'SD',
        access_control: { access_mode: AgentAccessControlMode.Public },
        configuration: {
          tools: [],
          skill_ids: [],
          connector_ids: [],
        },
      },
    }),
    agentBuilder.agents.ensure({
      spaceId,
      agent: {
        id: SIGNIFICANT_EVENTS_JUDGE_AGENT_ID,
        type: SIGNIFICANT_EVENTS_JUDGE_AGENT_TYPE_ID,
        name: 'Significant Events Judge',
        description:
          'Reviews proposed discoveries and decides whether to promote, acknowledge, or demote a significant event.',
        labels: ['observability', 'streams', 'significant-events', 'discovery', 'judge'],
        avatar_symbol: 'SJ',
        access_control: { access_mode: AgentAccessControlMode.Public },
        configuration: {
          tools: [],
          skill_ids: [],
          connector_ids: [],
        },
      },
    }),
  ]);
};
