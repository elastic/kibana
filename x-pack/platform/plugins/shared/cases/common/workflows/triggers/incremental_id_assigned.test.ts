/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_OWNER } from '../../constants';
import { incrementalIdAssignedTriggerCommonDefinition } from '.';

describe('incrementalIdAssigned trigger', () => {
  const payload = {
    caseId: 'case-1',
    owner: SECURITY_SOLUTION_OWNER,
    incrementalId: 44994,
  };
  const { eventSchema } = incrementalIdAssignedTriggerCommonDefinition;

  it('accepts the payload', () => {
    expect(eventSchema.safeParse(payload).success).toBe(true);
  });

  it('requires the incremental id', () => {
    const { incrementalId, ...withoutId } = payload;
    expect(eventSchema.safeParse(withoutId).success).toBe(false);
  });

  it('rejects non-positive or non-integer ids', () => {
    expect(eventSchema.safeParse({ ...payload, incrementalId: 0 }).success).toBe(false);
    expect(eventSchema.safeParse({ ...payload, incrementalId: 1.5 }).success).toBe(false);
  });

  it('rejects unexpected fields', () => {
    expect(eventSchema.safeParse({ ...payload, title: 'secret case data' }).success).toBe(false);
  });
});
