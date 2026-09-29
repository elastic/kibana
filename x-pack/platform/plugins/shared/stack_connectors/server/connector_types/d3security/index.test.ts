/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import axios from 'axios';
import type { D3SecurityConnectorType } from '.';
import { getConnectorType } from '.';

vi.mock('axios');
vi.mock('@kbn/actions-plugin/server/lib/axios_utils', async () => {
  const originalUtils = await vi.importActual('@kbn/actions-plugin/server/lib/axios_utils');
  return {
    ...originalUtils,
    request: vi.fn(),
    patch: vi.fn(),
  };
});

axios.create = vi.fn(() => axios);

let connectorType: D3SecurityConnectorType;

describe('D3 Security Connector', () => {
  beforeEach(() => {
    connectorType = getConnectorType();
  });
  test('exposes the connector as `D3Security` with id `.d3security`', () => {
    expect(connectorType.id).toEqual('.d3security');
    expect(connectorType.name).toEqual('D3 Security');
  });
});
