/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_ATTACHMENT_TYPE, ruleAttachmentDataSchema } from './rule_attachment_schema';

const baseRule = {
  kind: 'alert',
  metadata: { name: 'High CPU', tags: ['ops'] },
  time_field: '@timestamp',
  schedule: { every: '5m', lookback: '15m' },
  query: { base: 'FROM metrics-* | LIMIT 10' },
};

describe('ruleAttachmentDataSchema', () => {
  it('exports the namespaced attachment type id', () => {
    expect(RULE_ATTACHMENT_TYPE).toBe('platform.alerting.rule');
  });

  it('accepts a proposed rule with no server-generated fields', () => {
    const result = ruleAttachmentDataSchema.safeParse(baseRule);

    expect(result.success).toBe(true);
  });

  it('accepts a saved rule with id, enabled and timestamps', () => {
    const result = ruleAttachmentDataSchema.safeParse({
      ...baseRule,
      id: 'rule-1',
      enabled: true,
      created_at: '2026-04-01T00:00:00.000Z',
      updated_at: '2026-04-10T00:00:00.000Z',
      metadata: { ...baseRule.metadata, version: 1 },
    });

    expect(result.success).toBe(true);
  });

  it('drops the created_by / updated_by actors from a full rule response', () => {
    const result = ruleAttachmentDataSchema.parse({
      ...baseRule,
      id: 'rule-1',
      enabled: true,
      created_by: { profile_uid: 'u_alice' },
      created_at: '2026-04-01T00:00:00.000Z',
      updated_by: { profile_uid: 'u_bob' },
      updated_at: '2026-04-10T00:00:00.000Z',
    });

    expect(result).not.toHaveProperty('created_by');
    expect(result).not.toHaveProperty('updated_by');
    expect(result).toMatchObject({
      id: 'rule-1',
      created_at: '2026-04-01T00:00:00.000Z',
      updated_at: '2026-04-10T00:00:00.000Z',
    });
  });

  it('still resolves an attachment stored with the removed metadata.owner', () => {
    const result = ruleAttachmentDataSchema.parse({
      ...baseRule,
      id: 'rule-1',
      metadata: { ...baseRule.metadata, owner: 'u_alice' },
    });

    expect(result.metadata).not.toHaveProperty('owner');
    expect(result.metadata).toMatchObject({ name: 'High CPU' });
  });

  it('rejects a rule that is missing a required field', () => {
    const { query, ...withoutQuery } = baseRule;

    expect(ruleAttachmentDataSchema.safeParse(withoutQuery).success).toBe(false);
  });
});
