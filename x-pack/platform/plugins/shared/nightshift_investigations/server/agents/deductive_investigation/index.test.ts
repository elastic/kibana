/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { platformCoreTools, platformSignificantEventsTools } from '@kbn/agent-builder-common/tools';
import type { AgentBaseConfiguration, AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import {
  getDeductiveInvestigationAgentType,
  registerDeductiveInvestigationAgentType,
  NIGHTSHIFT_DEDUCTIVE_INVESTIGATION_AGENT_TYPE_ID,
} from '.';
import { SANDBOX_BASH_TOOL_ID } from '../../tools/sandbox_bash/tool';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../../tools/sandbox_bash/view_file_tool';
import { SANDBOX_STR_REPLACE_TOOL_ID } from '../../tools/sandbox_bash/str_replace_tool';
import { SANDBOX_WRITE_FILE_TOOL_ID } from '../../tools/sandbox_bash/write_file_tool';

const SANDBOX_TOOL_IDS = [
  SANDBOX_BASH_TOOL_ID,
  SANDBOX_VIEW_FILE_TOOL_ID,
  SANDBOX_STR_REPLACE_TOOL_ID,
  SANDBOX_WRITE_FILE_TOOL_ID,
];

const staticBase = (type: AgentTypeDefinition): AgentBaseConfiguration => {
  if (typeof type.baseConfiguration === 'function') {
    throw new Error('expected a static base configuration');
  }
  return type.baseConfiguration;
};

describe('deductive investigation agent type', () => {
  it('registers under its own type id, separate from the significant-events investigator', () => {
    const agentBuilder = agentBuilderMocks.createSetup();

    registerDeductiveInvestigationAgentType(agentBuilder);

    expect(agentBuilder.agents.registerType).toHaveBeenCalledWith(
      expect.objectContaining({ id: NIGHTSHIFT_DEDUCTIVE_INVESTIGATION_AGENT_TYPE_ID })
    );
  });

  it('carries a standalone sandbox prompt and no Elastic tools', () => {
    const base = staticBase(
      getDeductiveInvestigationAgentType({
        sandboxEnabled: true,
        cortexEnabled: true,
        memoryEnabled: true,
      })
    );

    expect(base).toMatchObject({
      enable_elastic_capabilities: false,
      skill_ids: [],
      workflow_ids: ['system-nightshift-sandbox-materialize-workspace'],
      post_execution_workflow_ids: ['system-nightshift-agent-optimize'],
    });
    expect(base.tools?.[0]?.tool_ids).toEqual([
      platformSignificantEventsTools.reportInvestigationProgress,
      ...SANDBOX_TOOL_IDS,
    ]);
    expect(base.tools?.[0]?.tool_ids).not.toContain(platformCoreTools.executeEsql);
    // Its own prompt, not the significant-events one: it documents the sandbox query path.
    expect(base.instructions).toContain('/workspace/elastic.md');
    expect(base.instructions).toContain('independently verify');
    expect(base.instructions).not.toContain('chronological log');
    expect(base.instructions).not.toContain('platform_core_execute_esql');
  });

  it('drops cortex and memory workflows when both are disabled', () => {
    const base = staticBase(
      getDeductiveInvestigationAgentType({ sandboxEnabled: true, cortexEnabled: false })
    );

    expect(base.workflow_ids).toBeUndefined();
    expect(base.post_execution_workflow_ids).toBeUndefined();
  });

  it('keeps the combined materialize and optimize workflows when cortex is off', () => {
    const base = staticBase(
      getDeductiveInvestigationAgentType({
        sandboxEnabled: true,
        cortexEnabled: false,
        memoryEnabled: true,
      })
    );

    expect(base.workflow_ids).toEqual(['system-nightshift-sandbox-materialize-workspace']);
    expect(base.post_execution_workflow_ids).toEqual(['system-nightshift-agent-optimize']);
  });

  it('drops the materialize workflow when the sandbox is not configured', () => {
    const base = staticBase(
      getDeductiveInvestigationAgentType({
        sandboxEnabled: false,
        cortexEnabled: true,
        memoryEnabled: true,
      })
    );

    expect(base.workflow_ids).toBeUndefined();
    expect(base.post_execution_workflow_ids).toEqual(['system-nightshift-agent-optimize']);
    expect(base.tools?.[0]?.tool_ids).toEqual([
      platformSignificantEventsTools.reportInvestigationProgress,
    ]);
  });

  it('allow-lists the telemetry connector when one is configured', () => {
    const base = staticBase(
      getDeductiveInvestigationAgentType({
        sandboxEnabled: true,
        cortexEnabled: true,
        memoryEnabled: true,
        telemetryConnectorId: 'elasticsearch-telemetry',
      })
    );

    expect(base.connector_ids).toEqual(['elasticsearch-telemetry']);
  });
});
