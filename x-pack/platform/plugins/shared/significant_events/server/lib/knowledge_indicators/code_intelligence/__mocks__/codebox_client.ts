/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CodeboxClient } from '../codebox_client';

/** A CodeboxClient where every method is a jest.Mock. */
export type MockedCodeboxClient = jest.Mocked<CodeboxClient>;

export const createMockCodeboxClient = (): MockedCodeboxClient => {
  return {
    health: jest.fn().mockResolvedValue({ status: 'ok' }),
    listRepos: jest.fn().mockResolvedValue([]),
    grep: jest.fn().mockResolvedValue([]),
    show: jest.fn().mockResolvedValue(''),
    tree: jest.fn().mockResolvedValue([]),
    languages: jest.fn().mockResolvedValue({}),
    refs: jest.fn().mockResolvedValue([]),
    resolveHead: jest.fn().mockResolvedValue('abc123'),
  } as unknown as MockedCodeboxClient;
};
