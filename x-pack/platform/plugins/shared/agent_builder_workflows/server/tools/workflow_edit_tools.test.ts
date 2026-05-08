/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stepDefinitionSchema } from './workflow_edit_tools';

describe('stepDefinitionSchema preserves extended step properties', () => {
  it('preserves on-failure in the parsed output', () => {
    const input = {
      name: 'fetch_data',
      type: 'http',
      with: { method: 'GET', url: 'https://example.com' },
      'on-failure': { retry: { 'max-attempts': 3 } },
    };
    const parsed = stepDefinitionSchema.parse(input);
    expect(parsed).toHaveProperty('on-failure');
    expect((parsed as any)['on-failure']).toEqual({ retry: { 'max-attempts': 3 } });
  });

  it('preserves timeout in the parsed output', () => {
    const input = {
      name: 'fetch_data',
      type: 'http',
      with: { method: 'GET', url: 'https://example.com' },
      timeout: '30s',
    };
    const parsed = stepDefinitionSchema.parse(input);
    expect(parsed).toHaveProperty('timeout');
    expect((parsed as any).timeout).toBe('30s');
  });

  it('preserves description in the parsed output', () => {
    const input = {
      name: 'fetch_data',
      type: 'http',
      description: 'Fetches data from external API',
    };
    const parsed = stepDefinitionSchema.parse(input);
    expect(parsed).toHaveProperty('description');
    expect((parsed as any).description).toBe('Fetches data from external API');
  });

  it('preserves do/else in the parsed output', () => {
    const input = {
      name: 'branch_step',
      type: 'condition',
      condition: 'steps.check.output.ok == true',
      do: [{ name: 'a', type: 'console' }],
      else: [{ name: 'c', type: 'console' }],
    };
    const parsed = stepDefinitionSchema.parse(input);
    expect(parsed).toHaveProperty('do');
    expect(parsed).toHaveProperty('else');
    expect(parsed).toHaveProperty('condition');
  });
});
