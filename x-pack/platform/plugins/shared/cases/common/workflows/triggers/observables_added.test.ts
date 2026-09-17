/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABLE_TYPE_IPV4, SECURITY_SOLUTION_OWNER } from '../../constants';
import { observablesAddedTriggerCommonDefinition } from '.';

describe('observablesAdded trigger', () => {
  const payload = {
    caseId: 'case-1',
    owner: SECURITY_SOLUTION_OWNER,
    observableIds: ['5c431380-c6ef-459f-b0fe-1699e978517b'],
    observableTypeKeys: [OBSERVABLE_TYPE_IPV4.key],
  };

  it('accepts the redacted observable payload', () => {
    expect(observablesAddedTriggerCommonDefinition.eventSchema.safeParse(payload).success).toBe(
      true
    );
  });

  it('rejects observable values and other unexpected fields', () => {
    expect(
      observablesAddedTriggerCommonDefinition.eventSchema.safeParse({
        ...payload,
        value: '1.2.3.4',
      }).success
    ).toBe(false);
  });
});
