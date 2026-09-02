/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildClusterValuePrefilledLines,
  buildFederatedIdentityManualSetupLineNumbers,
  federatedIdentityManualSetupJwtIssuerAnnotation,
  federatedIdentityManualSetupSubjectAnnotation,
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

  it('annotates the prefilled cluster value lines', () => {
    expect(buildClusterValuePrefilledLines(1, 2)).toEqual([
      { line: 1, annotation: federatedIdentityManualSetupJwtIssuerAnnotation() },
      { line: 2, annotation: federatedIdentityManualSetupSubjectAnnotation() },
    ]);
  });

  it('tells the user the prefilled values need no editing', () => {
    expect(federatedIdentityManualSetupJwtIssuerAnnotation()).not.toMatch(/replace/i);
    expect(federatedIdentityManualSetupSubjectAnnotation()).not.toMatch(/replace/i);
  });
});
