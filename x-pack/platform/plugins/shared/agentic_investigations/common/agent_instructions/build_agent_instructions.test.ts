/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAgentInstructions, ELASTIC_CLI_INSTALL_DOCS_URL } from './build_agent_instructions';

describe('buildAgentInstructions', () => {
  const text = buildAgentInstructions({
    investigationId: 'abc-123',
    kibanaUrl: 'https://kibana.example.com/s/team/',
  });

  it('points at the CLI install docs', () => {
    expect(text).toContain(ELASTIC_CLI_INSTALL_DOCS_URL);
    expect(text).toContain('npm install -g @elastic/cli');
  });

  it('reads the investigation by id from this Kibana, without a doubled slash', () => {
    expect(text).toContain('--conversation-id abc-123');
    expect(text).toContain('--kb-url "https://kibana.example.com/s/team"');
  });

  it('never carries a credential and stays read only', () => {
    expect(text).toContain('ask me for an API key');
    expect(text).toContain('Read only.');
  });
});
