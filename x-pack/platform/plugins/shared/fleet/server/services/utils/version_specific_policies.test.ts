/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../agents', () => ({
  getAvailableVersions: jest
    .fn()
    .mockResolvedValue(['9.3.0', '9.1.0', '8.6.0', '8.9.0', '8.8.0', '7.17.0']),
}));

jest.mock('../app_context', () => ({
  appContextService: {
    getKibanaVersion: () => '9.3.0',
    getLogger: () => ({
      debug: jest.fn(),
    }),
  },
}));

import { getCommonAgentVersions } from './version_specific_policies';

describe('getCommonAgentVersions', () => {
  it('should return the correct common agent versions', async () => {
    const result = await getCommonAgentVersions();
    expect(result).toEqual(['9.3', '9.2', '8.9']);
  });
});
