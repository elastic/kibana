/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFleetPackageAgentId, parseFleetAgentYaml } from './step_install_agent_assets';
import {
  substituteFleetAgentIds,
  substituteFleetAgentIdsWithUnresolved,
} from './step_install_workflow_assets';

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

    const result = parseFleetAgentYaml(yaml, 'fleet-default-sdlc-intel-sdlc-coverage-analysis');

    expect(result.id).toBe('fleet-default-sdlc-intel-sdlc-coverage-analysis');
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

    expect(result).toContain('agent-id: fleet-default-sdlc-intel-sdlc-coverage-analysis');
    expect(result).not.toContain('REPLACE_WITH_FLEET_AGENT_sdlc-coverage-analysis');
  });
});

describe('AB-006 fleet agent id namespace (collision policy)', () => {
  it('derives deterministic ids in the fleet-* namespace; fileBase is case-sensitive by convention', () => {
    const a = getFleetPackageAgentId({ pkgName: 'sdlc_intel', spaceId: 'default', fileName: 'sdlc-coverage-analysis.yaml' });
    const b = getFleetPackageAgentId({ pkgName: 'sdlc_intel', spaceId: 'default', fileName: 'sdlc-coverage-analysis.yaml' });
    expect(a).toBe(b);
    expect(a.startsWith('fleet-')).toBe(true);
    expect(a).toContain('sdlc-coverage-analysis');
  });

  it('different packages never collide (namespace includes pkgName)', () => {
    const a = getFleetPackageAgentId({ pkgName: 'sdlc_intel', spaceId: 'default', fileName: 'analyst.yaml' });
    const b = getFleetPackageAgentId({ pkgName: 'other_pkg', spaceId: 'default', fileName: 'analyst.yaml' });
    expect(a).not.toBe(b);
  });

  it('parseFleetAgentYaml stamps managed_by_package label and readonly (AB-004)', () => {
    const yaml = `
name: Test agent
description: tests things
labels: [custom]
configuration:
  tools:
    - tool_ids: [platform.core.integration_knowledge]
`;
    const req = parseFleetAgentYaml(yaml, 'fleet-default-test-agent');
    expect(req.labels).toContain('managed_by_package');
    expect(req.labels).toContain('custom');
    expect(req.readonly).toBe(true);
  });

  it('identifies the owning package by name, not by id prefix (AB-004)', () => {
    const yaml = `
name: Coverage analysis
description: analyses coverage
configuration:
  tools:
    - tool_ids: [platform.core.integration_knowledge]
`;

    // The live instance stamped "fleet-package:fleet-default-sdlc" here: the
    // package name sdlc_intel was unrecoverable, because the label was built by
    // slicing the agent id rather than from pkgName.
    const req = parseFleetAgentYaml(yaml, 'fleet-default-sdlc-intel-sdlc-coverage-analysis', {
      pkgName: 'sdlc_intel',
    });

    expect(req.labels).toContain('fleet-package:sdlc_intel');
    expect(req.labels).not.toContain('fleet-package:fleet-default-sdlc');
  });

  it('keeps the package label correct when the package name contains a hyphen (AB-004)', () => {
    const yaml = `
name: Agent
description: d
configuration:
  tools:
    - tool_ids: [platform.core.integration_knowledge]
`;

    const req = parseFleetAgentYaml(yaml, 'fleet-default-my-pkg-some-agent', {
      pkgName: 'my-pkg',
    });

    expect(req.labels).toContain('fleet-package:my-pkg');
  });
});

describe('substituteFleetAgentIdsWithUnresolved (AB-006 collision + validation policy)', () => {
  it('reports a placeholder as unresolved when no such agent was installed', () => {
    const yaml = `
steps:
  - agent-id: REPLACE_WITH_FLEET_AGENT_sdlc-typo-agent
`;

    const { yaml: result, unresolved } = substituteFleetAgentIdsWithUnresolved(yaml, {
      pkgName: 'sdlc_intel',
      spaceId: 'default',
      installedAgentIds: ['fleet-default-sdlc-intel-sdlc-coverage-analysis'],
    });

    expect(unresolved).toEqual(['REPLACE_WITH_FLEET_AGENT_sdlc-typo-agent']);
    // a dangling id must NOT be written into the workflow
    expect(result).not.toContain('fleet-default-sdlc-intel-sdlc-typo-agent');
  });

  it('substitutes placeholders that match an installed agent', () => {
    const yaml = `
steps:
  - agent-id: REPLACE_WITH_FLEET_AGENT_sdlc-coverage-analysis
`;

    const { yaml: result, unresolved } = substituteFleetAgentIdsWithUnresolved(yaml, {
      pkgName: 'sdlc_intel',
      spaceId: 'default',
      installedAgentIds: ['fleet-default-sdlc-intel-sdlc-coverage-analysis'],
    });

    expect(unresolved).toEqual([]);
    expect(result).toContain('agent-id: fleet-default-sdlc-intel-sdlc-coverage-analysis');
  });

  it('skips validation when the installed agent list is not provided (back-compat)', () => {
    const yaml = 'agent-id: REPLACE_WITH_FLEET_AGENT_sdlc-coverage-analysis';

    const { yaml: result, unresolved } = substituteFleetAgentIdsWithUnresolved(yaml, {
      pkgName: 'sdlc_intel',
      spaceId: 'default',
    });

    expect(unresolved).toEqual([]);
    expect(result).toContain('fleet-default-sdlc-intel-sdlc-coverage-analysis');
  });

  it('enforces the fleet-* namespace: a placeholder cannot escape it', () => {
    const yaml = 'agent-id: REPLACE_WITH_FLEET_AGENT_sdlc-coverage-analysis';

    const { yaml: result } = substituteFleetAgentIdsWithUnresolved(yaml, {
      pkgName: 'sdlc_intel',
      spaceId: 'default',
    });

    const id = result.split('agent-id: ')[1].trim();
    expect(id.startsWith('fleet-')).toBe(true);
  });
});
