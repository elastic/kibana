/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

import { parseFleetAgentYaml } from './packages/install_state_machine/steps/step_install_agent_assets';

const AGENT_DIR = join(
  __dirname,
  '..',
  '..',
  '..',
  'test',
  'fixtures',
  'sdlc_intel',
  'kibana',
  'agent'
);

// These fixtures are the package's shipped agent assets. Validating them with a
// local YAML parse and a hand-written schema lets them drift away from what Fleet
// actually accepts: an earlier revision used a flat `tools:` list plus a top-level
// `instructions:`, which parseFleetAgentYaml rejects outright, so an upload install
// of this package failed at the agent-asset step while this suite stayed green.
// Validate through the real parser instead.
describe('AB-002: Platform ES|QL tools for package agents', () => {
  const files = readdirSync(AGENT_DIR).filter((f) => f.endsWith('.yaml'));

  it('has at least 2 SDLC agent YAML files', () => {
    expect(files.length).toBeGreaterThanOrEqual(2);
  });

  for (const file of files) {
    describe(`agent: ${file}`, () => {
      const content = readFileSync(join(AGENT_DIR, file), 'utf-8');
      const agentId = `fleet-default-sdlc-intel-${file.replace(/\.yaml$/, '')}`;

      it('is accepted by the Fleet agent-asset parser', () => {
        expect(() => parseFleetAgentYaml(content, agentId, { pkgName: 'sdlc_intel' })).not.toThrow();
      });

      it('carries a name, description and instructions', () => {
        const agent = parseFleetAgentYaml(content, agentId, { pkgName: 'sdlc_intel' });
        expect(agent.name).toBeTruthy();
        expect(agent.description).toBeTruthy();
        expect(agent.configuration.instructions).toBeTruthy();
      });

      it('uses only platform tools', () => {
        const platformTools = [
          'platform.core.execute_esql',
          'platform.core.generate_esql',
          'platform.core.integration_knowledge',
          'platform.core.search',
          'platform.core.list_indices',
          'platform.core.get_index_mapping',
        ];
        const agent = parseFleetAgentYaml(content, agentId, { pkgName: 'sdlc_intel' });
        const toolIds = (agent.configuration.tools ?? []).flatMap(
          (entry: { tool_ids?: string[] }) => entry.tool_ids ?? []
        );

        expect(toolIds.length).toBeGreaterThan(0);
        for (const toolId of toolIds) {
          expect(platformTools).toContain(toolId);
        }
      });

      it('does not use product builtin tools', () => {
        const bannedTools = [/^endpoint\./, /^osquery\./, /^cases\./];
        const agent = parseFleetAgentYaml(content, agentId, { pkgName: 'sdlc_intel' });
        const toolIds = (agent.configuration.tools ?? []).flatMap(
          (entry: { tool_ids?: string[] }) => entry.tool_ids ?? []
        );

        for (const toolId of toolIds) {
          for (const banned of bannedTools) {
            expect(toolId).not.toMatch(banned);
          }
        }
      });
    });
  }
});
