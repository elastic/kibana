/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import { platformSignificantEventsTools } from '@kbn/agent-builder-common/tools';
import {
  NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
  NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import instructions from './instructions/deductive_investigator.md.text';
import { SANDBOX_BASH_TOOL_ID } from '../../tools/sandbox_bash/tool';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../../tools/sandbox_bash/view_file_tool';
import { SANDBOX_STR_REPLACE_TOOL_ID } from '../../tools/sandbox_bash/str_replace_tool';
import { SANDBOX_WRITE_FILE_TOOL_ID } from '../../tools/sandbox_bash/write_file_tool';

export const NIGHTSHIFT_DEDUCTIVE_INVESTIGATION_AGENT_ID =
  'significant-events.deductive-investigation';
export const NIGHTSHIFT_DEDUCTIVE_INVESTIGATION_AGENT_TYPE_ID =
  'platform.sig_events.deductive-investigation-type';

const SANDBOX_TOOL_IDS = [
  SANDBOX_BASH_TOOL_ID,
  SANDBOX_VIEW_FILE_TOOL_ID,
  SANDBOX_STR_REPLACE_TOOL_ID,
  SANDBOX_WRITE_FILE_TOOL_ID,
] as const;

export const DEDUCTIVE_INVESTIGATION_AGENT_NAME = 'Nightshift Deductive Investigator';
export const DEDUCTIVE_INVESTIGATION_AGENT_DESCRIPTION =
  'Answers an arbitrary investigation question by reasoning from cluster telemetry it queries ' +
  'inside a sandbox, and records what it learns in the Nightshift Cortex wiki.';

/**
 * Builds the deductive investigation agent type. It is deliberately separate from
 * `significant-events.investigation`, which keeps its own prompt and Agent Builder tools: this
 * agent works only from the sandbox, so it carries a standalone prompt and no ES|QL or
 * observability tools. Telemetry is reached through `telemetryConnectorId` as described in
 * `/workspace/elastic.md`.
 */
export const getDeductiveInvestigationAgentType = ({
  sandboxEnabled,
  cortexEnabled,
  memoryEnabled = false,
  telemetryConnectorId,
}: {
  sandboxEnabled: boolean;
  cortexEnabled: boolean;
  memoryEnabled?: boolean;
  telemetryConnectorId?: string;
}): AgentTypeDefinition => {
  // One beforeAgent and one afterExecution workflow: Agent Builder runs those
  // lists in series. Obtain runs first in each; cortex + memory then run in
  // parallel against the same sandbox_id the bash tools derive.
  const materializeIds =
    sandboxEnabled && (cortexEnabled || memoryEnabled)
      ? [NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID]
      : [];
  const optimizeIds = cortexEnabled || memoryEnabled ? [NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID] : [];

  return {
    id: NIGHTSHIFT_DEDUCTIVE_INVESTIGATION_AGENT_TYPE_ID,
    name: DEDUCTIVE_INVESTIGATION_AGENT_NAME,
    description: DEDUCTIVE_INVESTIGATION_AGENT_DESCRIPTION,
    avatar_icon: 'logoElastic',
    baseConfiguration: {
      instructions,
      skill_ids: [],
      tools: [
        {
          tool_ids: [
            platformSignificantEventsTools.reportInvestigationProgress,
            ...(sandboxEnabled ? [...SANDBOX_TOOL_IDS] : []),
          ],
        },
      ],
      enable_elastic_capabilities: false,
      connector_ids: telemetryConnectorId ? [telemetryConnectorId] : [],
      ...(materializeIds.length > 0 ? { workflow_ids: materializeIds } : {}),
      ...(optimizeIds.length > 0 ? { post_execution_workflow_ids: optimizeIds } : {}),
    },
  };
};

export const registerDeductiveInvestigationAgentType = (
  agentBuilder: AgentBuilderPluginSetup,
  {
    sandboxEnabled,
    cortexEnabled,
    memoryEnabled,
    telemetryConnectorId,
  }: {
    sandboxEnabled: boolean;
    cortexEnabled: boolean;
    memoryEnabled?: boolean;
    telemetryConnectorId?: string;
  } = { sandboxEnabled: false, cortexEnabled: false, memoryEnabled: false }
): void => {
  agentBuilder.agents.registerType(
    getDeductiveInvestigationAgentType({
      sandboxEnabled,
      cortexEnabled,
      memoryEnabled,
      telemetryConnectorId,
    })
  );
};
