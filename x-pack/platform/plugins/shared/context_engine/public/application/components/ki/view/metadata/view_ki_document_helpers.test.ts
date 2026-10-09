/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readKiGovernance } from './view_ki_document_helpers';

describe('readKiGovernance', () => {
  it('accepts string provenance writers', () => {
    expect(
      readKiGovernance({
        governance: { provenance: { created_by: 'workflow://legacy-wf' } },
      }).createdBy
    ).toEqual({ uri: 'workflow://legacy-wf', metadata: {} });
  });

  it('returns a typed lifecycle status when present', () => {
    expect(
      readKiGovernance({
        governance: { lifecycle: { status: 'deleted' } },
      }).lifecycleStatus
    ).toBe('deleted');
    expect(
      readKiGovernance({
        governance: { lifecycle: { status: 'pending' } },
      }).lifecycleStatus
    ).toBeUndefined();
  });
});
