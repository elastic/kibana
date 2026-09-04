/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import { canReadV1Rules } from './can_read_v1_rules';

describe('canReadV1Rules', () => {
  it('returns true when the triggersActionsRules capability is granted', () => {
    const capabilities = {
      management: { insightsAndAlerting: { triggersActionsRules: true } },
    } as unknown as Capabilities;

    expect(canReadV1Rules(capabilities)).toBe(true);
  });

  it('returns false when the capability is explicitly denied', () => {
    const capabilities = {
      management: { insightsAndAlerting: { triggersActionsRules: false } },
    } as unknown as Capabilities;

    expect(canReadV1Rules(capabilities)).toBe(false);
  });

  it('returns false when the management section is absent', () => {
    const capabilities = {} as Capabilities;

    expect(canReadV1Rules(capabilities)).toBe(false);
  });
});
