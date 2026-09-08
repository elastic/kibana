/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IAC_FEDERATED_IDENTITY_WORKFLOW, blueprintMatchesWorkflow } from './iac_provisioner';

describe('blueprintMatchesWorkflow', () => {
  it('matches the hyphenated lineage id and the namespaced form', () => {
    expect(blueprintMatchesWorkflow('federated-identity', IAC_FEDERATED_IDENTITY_WORKFLOW)).toBe(
      true
    );
    expect(
      blueprintMatchesWorkflow('aws/federated-identity', IAC_FEDERATED_IDENTITY_WORKFLOW)
    ).toBe(true);
  });

  it('does not match a different lineage', () => {
    expect(blueprintMatchesWorkflow('other-lineage', IAC_FEDERATED_IDENTITY_WORKFLOW)).toBe(false);
    expect(blueprintMatchesWorkflow('aws/other-lineage', IAC_FEDERATED_IDENTITY_WORKFLOW)).toBe(
      false
    );
    expect(
      blueprintMatchesWorkflow('aws/federated-identity/account', IAC_FEDERATED_IDENTITY_WORKFLOW)
    ).toBe(false);
  });
});
