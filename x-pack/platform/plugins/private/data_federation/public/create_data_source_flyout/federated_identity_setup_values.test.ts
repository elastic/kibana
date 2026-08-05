/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveFederatedIdentitySetupValues } from './federated_identity_setup_values';

describe('resolveFederatedIdentitySetupValues', () => {
  it('uses placeholder values when cloud info is missing', () => {
    expect(resolveFederatedIdentitySetupValues(undefined)).toEqual({
      jwtIssuer: 'https://<your-jwt-issuer>',
      subject: 'deployment:<your-deployment-id>',
    });
  });

  it('uses injected cloud info values when present', () => {
    expect(
      resolveFederatedIdentitySetupValues({
        jwtIssuer: 'https://issuer.example',
        cloudOrgId: 'org-1',
        deploymentId: 'project:abc',
        isServerless: true,
      })
    ).toEqual({
      jwtIssuer: 'https://issuer.example',
      subject: 'project:abc',
    });
  });

  it('uses serverless placeholder when cloud info is serverless without deployment id', () => {
    expect(
      resolveFederatedIdentitySetupValues({
        jwtIssuer: '',
        cloudOrgId: 'org-1',
        deploymentId: '',
        isServerless: true,
      })
    ).toEqual({
      jwtIssuer: 'https://<your-jwt-issuer>',
      subject: 'project:<your-project-id>',
    });
  });
});
