/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

export const parseDeploymentIdFromDeploymentUrlMock = vi.fn();

vi.doMock('../common/parse_deployment_id_from_deployment_url', () => {
  return {
    parseDeploymentIdFromDeploymentUrl: parseDeploymentIdFromDeploymentUrlMock,
  };
});

export const decodeCloudIdMock = vi.fn();

vi.doMock('../common/decode_cloud_id', () => {
  return {
    decodeCloudId: decodeCloudIdMock,
  };
});
