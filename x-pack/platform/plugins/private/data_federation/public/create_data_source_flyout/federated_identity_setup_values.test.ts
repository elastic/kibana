/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveFederatedIdentitySetupValues } from './federated_identity_setup_values';

describe('resolveFederatedIdentitySetupValues', () => {
  it('falls back to mock values the user never has to edit when cloud info is missing', () => {
    const { jwtIssuer, subject } = resolveFederatedIdentitySetupValues(undefined);

    expect(jwtIssuer).toMatch(/^https:\/\//);
    expect(subject).toMatch(/^deployment:/);
    expect(`${jwtIssuer} ${subject}`).not.toContain('<your-');
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

  it('falls back to mock values when cloud info is present but empty', () => {
    const { jwtIssuer, subject } = resolveFederatedIdentitySetupValues({
      jwtIssuer: '',
      cloudOrgId: 'org-1',
      deploymentId: '',
      isServerless: true,
    });

    expect(jwtIssuer).toMatch(/^https:\/\//);
    expect(subject).toMatch(/^deployment:/);
  });
});
