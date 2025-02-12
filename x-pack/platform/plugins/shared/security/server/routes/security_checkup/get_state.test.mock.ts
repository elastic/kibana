/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { createClusterDataCheck } from '../../security_checkup';

export const mockCreateClusterDataCheck = jest.fn() as jest.MockedFunction<
  typeof createClusterDataCheck
>;

jest.mock('../../security_checkup', () => ({
  createClusterDataCheck: mockCreateClusterDataCheck,
}));
