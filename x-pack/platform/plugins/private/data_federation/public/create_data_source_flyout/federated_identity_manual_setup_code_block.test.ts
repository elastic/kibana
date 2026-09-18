/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { federatedIdentityManualSetupStrings } from './federated_identity_manual_setup_code_block';

describe('federatedIdentityManualSetupStrings', () => {
  // These two values are resolved from cloud metadata, so editing them breaks the trust policy.
  it('tells the user to leave the prefilled values unchanged', () => {
    for (const annotation of [
      federatedIdentityManualSetupStrings.jwtIssuerAnnotation(),
      federatedIdentityManualSetupStrings.subjectAnnotation(),
    ]) {
      expect(annotation).toMatch(/unchanged/i);
      expect(annotation).not.toMatch(/replace/i);
    }
  });
});
