/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIsEce } from './get_is_ece';

describe('getIsEce', () => {
  it.each([
    {
      name: 'defaults to true for cloud-enabled non-serverless deployments',
      params: {
        isCloudEnabled: true,
        isServerlessEnabled: false,
      },
      expected: true,
    },
    {
      name: 'returns false when the deployment is explicitly a SaaS container',
      params: {
        isCloudEnabled: true,
        isServerlessEnabled: false,
        isSaasContainer: true,
      },
      expected: false,
    },
    {
      name: 'returns true when the deployment is explicitly not a SaaS container',
      params: {
        isCloudEnabled: true,
        isServerlessEnabled: false,
        isSaasContainer: false,
      },
      expected: true,
    },
    {
      name: 'keeps serverless deployments undefined when isSaasContainer is missing',
      params: {
        isCloudEnabled: true,
        isServerlessEnabled: true,
      },
      expected: undefined,
    },
    {
      name: 'keeps self-managed deployments undefined when isSaasContainer is missing',
      params: {
        isCloudEnabled: false,
        isServerlessEnabled: false,
      },
      expected: undefined,
    },
  ])('$name', ({ params, expected }) => {
    expect(getIsEce(params)).toBe(expected);
  });
});
