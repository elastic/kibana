/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getModifiedILMs } from './modified_ilms';

jest.mock('../services/epm/elasticsearch/template/default_settings', () => {
  return {
    getILMPolicies: jest.fn().mockResolvedValue(
      new Map([
        ['logs', { deprecatedILMPolicy: { version: 2 }, newILMPolicy: { version: 1 } }],
        ['metrics', { deprecatedILMPolicy: { version: 1 }, newILMPolicy: { version: 3 } }],
        ['synthetics', { deprecatedILMPolicy: { version: 2 }, newILMPolicy: { version: 1 } }],
      ])
    ),
  };
});

describe('getModifiedILMs', () => {
  it('should return an array of modified ILM policy names', async () => {
    const modifiedILMs = await getModifiedILMs();
    expect(modifiedILMs).toEqual(['logs', 'metrics@lifecycle', 'synthetics']);
  });
});
