/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { substituteFleetAgentIdsWithUnresolved } from './step_install_workflow_assets';

/**
 * AB-006 contract pinned against the ids the SDLC package actually installs on
 * the dogfood instance (verified live via GET /api/agent_builder/agents).
 */
const LIVE_AGENT_IDS = [
  'fleet-default-sdlc-intel-sdlc-scope-alignment',
  'fleet-default-sdlc-intel-sdlc-coverage-analysis',
  'fleet-default-sdlc-intel-sdlc-pr-missing-related-issue',
];

describe('AB-006 live contract', () => {
  it.each([
    'sdlc-scope-alignment',
    'sdlc-coverage-analysis',
    'sdlc-pr-missing-related-issue',
  ])('resolves the real placeholder %s to an installed agent', (base) => {
    const { yaml, unresolved } = substituteFleetAgentIdsWithUnresolved(
      `agent-id: REPLACE_WITH_FLEET_AGENT_${base}`,
      { pkgName: 'sdlc_intel', spaceId: 'default', installedAgentIds: LIVE_AGENT_IDS }
    );

    expect(unresolved).toEqual([]);
    const resolved = yaml.split('agent-id: ')[1].trim();
    expect(LIVE_AGENT_IDS).toContain(resolved);
  });

  it('refuses to mint the dangling id that 404s on the live instance', () => {
    // GET /api/agent_builder/agents/fleet-default-sdlc-intel-sdlc-typo-agent -> 404
    const { yaml, unresolved } = substituteFleetAgentIdsWithUnresolved(
      'agent-id: REPLACE_WITH_FLEET_AGENT_sdlc-typo-agent',
      { pkgName: 'sdlc_intel', spaceId: 'default', installedAgentIds: LIVE_AGENT_IDS }
    );

    expect(unresolved).toEqual(['REPLACE_WITH_FLEET_AGENT_sdlc-typo-agent']);
    expect(yaml).not.toContain('fleet-default-sdlc-intel-sdlc-typo-agent');
  });
});
