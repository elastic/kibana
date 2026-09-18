/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import type { InvestigationAttributes } from '../storage/types';
import { nightshiftInvestigationSavedObjectType } from './investigation_saved_object';

const modelVersions =
  nightshiftInvestigationSavedObjectType.modelVersions as SavedObjectsModelVersionMap;
const createSchema = modelVersions[3]!.schemas!.create!;

const attributes = (overrides: Partial<InvestigationAttributes> = {}): InvestigationAttributes => ({
  status: 'pending',
  subject_type: 'manual',
  subject_id: 'source-abc',
  title: 'Checkout failures',
  trigger_type: 'manual',
  created_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('nightshift investigation saved object', () => {
  it('accepts an admission that is reserved but has not started its run', () => {
    expect(() =>
      createSchema.validate(
        attributes({ admissions: [{ idempotency_key: 'slack_message:T1:C1:100.1' }] })
      )
    ).not.toThrow();
  });

  it('accepts an admission once its run has started', () => {
    expect(() =>
      createSchema.validate(
        attributes({
          admissions: [{ idempotency_key: 'slack_message:T1:C1:100.1', execution_id: 'exec-1' }],
        })
      )
    ).not.toThrow();
  });

  it('rejects an admission with no idempotency key to deduplicate on', () => {
    expect(() =>
      createSchema.validate(attributes({ admissions: [{ execution_id: 'exec-1' } as never] }))
    ).toThrow();
  });

  it('accepts a Slack reply target before its findings message exists', () => {
    expect(() =>
      createSchema.validate(
        attributes({
          reply_target: {
            surface: 'slack',
            tenant_key: 'T1',
            channel: 'C1',
            thread_ts: '100.1',
          },
        })
      )
    ).not.toThrow();
  });
});
