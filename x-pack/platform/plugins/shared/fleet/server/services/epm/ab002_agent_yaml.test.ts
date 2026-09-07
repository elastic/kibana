/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';

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

describe('AB-002: Platform ES|QL tools for package agents', () => {
  const files = readdirSync(AGENT_DIR).filter((f) => f.endsWith('.yaml'));

  it('has at least 2 SDLC agent YAML files', () => {
    expect(files.length).toBeGreaterThanOrEqual(2);
  });

  for (const file of files) {
    describe(`agent: ${file}`, () => {
      const content = readFileSync(join(AGENT_DIR, file), 'utf-8');
      const agent = parse(content);

      it('has a name', () => {
        expect(agent.name).toBeTruthy();
        expect(typeof agent.name).toBe('string');
      });

      it('has instructions', () => {
        expect(agent.instructions).toBeTruthy();
      });

      it('uses only platform tools', () => {
        const platformTools = [
          'elasticsearch.search',
          'elasticsearch.esql.query',
          'elasticsearch.esql.materialize',
          'elasticsearch.index',
          'elasticsearch.bulk',
          'integration_knowledge',
        ];
        expect(agent.tools).toBeDefined();
        expect(Array.isArray(agent.tools)).toBe(true);
        for (const tool of agent.tools) {
          expect(platformTools).toContain(tool);
        }
      });

      it('does not use product builtin tools', () => {
        const bannedTools = ['endpoint.*', 'osquery.*', 'cases.*'];
        if (agent.tools) {
          for (const tool of agent.tools) {
            for (const banned of bannedTools) {
              expect(tool).not.toMatch(new RegExp(banned));
            }
          }
        }
      });
    });
  }
});
