/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseFleetAgentYaml } from './step_install_agent_assets';
import { substituteFleetAgentIds } from './step_install_workflow_assets';

describe('parseFleetAgentYaml', () => {
  it('parses a valid fleet agent definition', () => {
    const yaml = `
name: SDLC Coverage Analysis
description: Planning coverage analyst
labels:
  - sdlc
configuration:
  instructions: Analyze planning coverage
  tools:
    - tool_ids:
        - platform.core.execute_esql
  connector_ids:
    - ai-conn-1
`;

    const result = parseFleetAgentYaml(yaml, 'fleet-default-sdlc_intel-sdlc-coverage-analysis');

    expect(result.id).toBe('fleet-default-sdlc_intel-sdlc-coverage-analysis');
    expect(result.name).toBe('SDLC Coverage Analysis');
    expect(result.configuration.tools[0].tool_ids).toContain('platform.core.execute_esql');
  });
});

describe('substituteFleetAgentIds', () => {
  it('replaces fleet agent placeholders with deterministic fleet ids', () => {
    const yaml = `
steps:
  - agent-id: REPLACE_WITH_FLEET_AGENT_sdlc-coverage-analysis
`;

    const result = substituteFleetAgentIds(yaml, {
      pkgName: 'sdlc_intel',
      spaceId: 'default',
    });

    expect(result).toContain('agent-id: fleet-default-sdlc_intel-sdlc-coverage-analysis');
    expect(result).not.toContain('REPLACE_WITH_FLEET_AGENT_sdlc-coverage-analysis');
  });
});
