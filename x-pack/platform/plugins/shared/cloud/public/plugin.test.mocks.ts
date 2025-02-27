/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const parseDeploymentIdFromDeploymentUrlMock = jest.fn();

jest.doMock('../common/parse_deployment_id_from_deployment_url', () => {
  return {
    parseDeploymentIdFromDeploymentUrl: parseDeploymentIdFromDeploymentUrlMock,
  };
});

export const decodeCloudIdMock = jest.fn();

jest.doMock('../common/decode_cloud_id', () => {
  return {
    decodeCloudId: decodeCloudIdMock,
  };
});
