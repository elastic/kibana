/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildClusterValueEditableLines,
  buildFederatedIdentityManualSetupLineNumbers,
  federatedIdentityManualSetupBucketAnnotation,
  federatedIdentityManualSetupJwtIssuerAnnotation,
  federatedIdentityManualSetupSubjectAnnotation,
  isFederatedIdentityPlaceholderValue,
} from './federated_identity_manual_setup_code_block';

describe('federated identity manual setup code block helpers', () => {
  it('builds highlight and annotations for editable lines', () => {
    expect(
      buildFederatedIdentityManualSetupLineNumbers([
        { line: 1, annotation: 'Replace bucket name' },
        { line: 3 },
      ])
    ).toEqual({
      highlight: '1, 3',
      annotations: {
        1: 'Replace bucket name',
        3: 'Replace this placeholder with your own value before running the command.',
      },
    });
  });

  it('returns undefined when there are no editable lines', () => {
    expect(buildFederatedIdentityManualSetupLineNumbers([])).toBeUndefined();
  });

  it('adds cluster value lines only when placeholders are present', () => {
    expect(
      buildClusterValueEditableLines(1, 2, {
        jwtIssuer: 'https://issuer.example',
        subject: 'project:abc',
      })
    ).toEqual([]);

    expect(
      buildClusterValueEditableLines(1, 2, {
        jwtIssuer: 'https://<your-jwt-issuer>',
        subject: 'project:<your-project-id>',
      })
    ).toEqual([
      { line: 1, annotation: federatedIdentityManualSetupJwtIssuerAnnotation() },
      { line: 2, annotation: federatedIdentityManualSetupSubjectAnnotation() },
    ]);
  });

  it('detects placeholder values in command strings', () => {
    expect(isFederatedIdentityPlaceholderValue('https://<your-jwt-issuer>')).toBe(true);
    expect(isFederatedIdentityPlaceholderValue('/subscriptions/<subscription-id>/')).toBe(true);
    expect(isFederatedIdentityPlaceholderValue('https://issuer.example')).toBe(false);
  });
});
