/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_TOOL_IDS } from '@kbn/alerting-v2-constants';
import type { RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import type { AttachmentDraft } from '../../../lib/attachments_client';
import { assertRuleLinkable } from './assert_rule_linkable';
import { LinkValidationError } from './link_validation_error';

const RULE_ID = '3f2a9c1b-7d4e-4a55-9c0e-1b2c3d4e5f60';

const draft = (
  data: Record<string, unknown>,
  overrides: Partial<AttachmentDraft<RuleAttachmentData>> = {}
): AttachmentDraft<RuleAttachmentData> => ({
  attachmentId: 'rule-att',
  isNew: false,
  data: data as Partial<RuleAttachmentData>,
  ...overrides,
});

const validData = { id: RULE_ID, kind: 'alert', metadata: { name: 'High CPU' } };

describe('assertRuleLinkable', () => {
  it('returns the rule id and metadata of a linkable rule', () => {
    expect(assertRuleLinkable(draft(validData), 'rule-att')).toEqual({
      ruleId: RULE_ID,
      metadata: { name: 'High CPU' },
    });
  });

  it('prefers the persisted origin over the draft id', () => {
    const result = assertRuleLinkable(draft(validData, { origin: 'persisted-id' }), 'rule-att');

    expect(result.ruleId).toBe('persisted-id');
  });

  it('uses the origin when the draft data has no id', () => {
    const result = assertRuleLinkable(
      draft({ ...validData, id: undefined }, { origin: RULE_ID }),
      'rule-att'
    );

    expect(result.ruleId).toBe(RULE_ID);
  });

  it('rejects a missing rule attachment', () => {
    expect(() => assertRuleLinkable(draft({}, { isNew: true }), 'rule-att')).toThrow(
      new LinkValidationError(
        `Rule attachment "rule-att" was not found. Create it with ${ALERTING_TOOL_IDS.manageRule} first.`
      )
    );
  });

  it('rejects a rule without a name', () => {
    expect(() => assertRuleLinkable(draft({ ...validData, metadata: {} }), 'rule-att')).toThrow(
      /has no name yet/
    );
  });

  it('rejects signal rules', () => {
    expect(() => assertRuleLinkable(draft({ ...validData, kind: 'signal' }), 'rule-att')).toThrow(
      /Signal rules never create alerts/
    );
  });

  it('rejects a rule without a kind', () => {
    expect(() => assertRuleLinkable(draft({ ...validData, kind: undefined }), 'rule-att')).toThrow(
      /has no kind yet/
    );
  });

  it('rejects a rule without an id', () => {
    expect(() => assertRuleLinkable(draft({ ...validData, id: undefined }), 'rule-att')).toThrow(
      /has no id yet/
    );
  });
});
