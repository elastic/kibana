/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SECURITY_SOLUTION_OWNER,
  OBSERVABILITY_OWNER,
  GENERAL_CASES_OWNER,
} from '../../constants/owners';
import {
  SECURITY_ALERT_ATTACHMENT_TYPE,
  OBSERVABILITY_ALERT_ATTACHMENT_TYPE,
  STACK_ALERT_ATTACHMENT_TYPE,
} from '../../constants/attachments';
import { buildAlertCaseAttachment } from './build_alert_attachment';

describe('buildAlertCaseAttachment', () => {
  describe('type resolution by owner', () => {
    it('resolves security.alert for securitySolution owner', () => {
      const result = buildAlertCaseAttachment(SECURITY_SOLUTION_OWNER, {
        alertId: 'alert-1',
        index: 'idx-1',
      });
      expect(result.type).toBe(SECURITY_ALERT_ATTACHMENT_TYPE);
    });

    it('resolves observability.alert for observability owner', () => {
      const result = buildAlertCaseAttachment(OBSERVABILITY_OWNER, {
        alertId: 'alert-1',
        index: 'idx-1',
      });
      expect(result.type).toBe(OBSERVABILITY_ALERT_ATTACHMENT_TYPE);
    });

    it('resolves stack.alert for cases owner', () => {
      const result = buildAlertCaseAttachment(GENERAL_CASES_OWNER, {
        alertId: 'alert-1',
        index: 'idx-1',
      });
      expect(result.type).toBe(STACK_ALERT_ATTACHMENT_TYPE);
    });
  });

  describe('attachmentId and index', () => {
    it('passes through a scalar alertId and index', () => {
      const result = buildAlertCaseAttachment(SECURITY_SOLUTION_OWNER, {
        alertId: 'alert-1',
        index: 'idx-1',
      });
      expect(result.attachmentId).toBe('alert-1');
      expect(result.metadata.index).toBe('idx-1');
    });

    it('passes through array alertId and index', () => {
      const result = buildAlertCaseAttachment(SECURITY_SOLUTION_OWNER, {
        alertId: ['alert-1', 'alert-2'],
        index: ['idx-1', 'idx-2'],
      });
      expect(result.attachmentId).toEqual(['alert-1', 'alert-2']);
      expect(result.metadata.index).toEqual(['idx-1', 'idx-2']);
    });
  });

  describe('rule field', () => {
    it('defaults rule to null when omitted', () => {
      const result = buildAlertCaseAttachment(SECURITY_SOLUTION_OWNER, {
        alertId: 'alert-1',
        index: 'idx-1',
      });
      expect(result.metadata.rule).toBeNull();
    });

    it('passes through an explicit null rule', () => {
      const result = buildAlertCaseAttachment(SECURITY_SOLUTION_OWNER, {
        alertId: 'alert-1',
        index: 'idx-1',
        rule: null,
      });
      expect(result.metadata.rule).toBeNull();
    });

    it('passes through a rule with id and name', () => {
      const result = buildAlertCaseAttachment(SECURITY_SOLUTION_OWNER, {
        alertId: 'alert-1',
        index: 'idx-1',
        rule: { id: 'rule-id', name: 'My rule' },
      });
      expect(result.metadata.rule).toEqual({ id: 'rule-id', name: 'My rule' });
    });

    it('passes through a rule with null id and name', () => {
      const result = buildAlertCaseAttachment(SECURITY_SOLUTION_OWNER, {
        alertId: 'alert-1',
        index: 'idx-1',
        rule: { id: null, name: null },
      });
      expect(result.metadata.rule).toEqual({ id: null, name: null });
    });
  });

  it('does not include owner in the returned object', () => {
    const result = buildAlertCaseAttachment(SECURITY_SOLUTION_OWNER, {
      alertId: 'alert-1',
      index: 'idx-1',
    });
    expect(result).not.toHaveProperty('owner');
  });
});
