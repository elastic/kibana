/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MISSING_UIAM_API_KEY_TAG,
  LEGACY_MISSING_UIAM_API_KEY_TAG,
} from '@kbn/alerting-plugin/common';
import type { Rule } from '../../types';
import { diagnoseRule, isRuleDiagnosable } from './rule_diagnostics';

const buildRule = (overrides: Partial<Rule> = {}): Rule =>
  ({
    id: '1',
    enabled: true,
    tags: [],
    executionStatus: { status: 'ok' },
    lastRun: { outcome: 'succeeded', alertsCount: {} },
    ...overrides,
  } as unknown as Rule);

describe('diagnoseRule', () => {
  it('returns nothing for a healthy rule', () => {
    expect(diagnoseRule(buildRule())).toEqual([]);
    expect(isRuleDiagnosable(buildRule())).toBe(false);
  });

  it('maps an execute failure to an edit action with the outcome messages', () => {
    const [diagnosis] = diagnoseRule(
      buildRule({
        executionStatus: { status: 'error', error: { reason: 'execute', message: 'ignored' } },
        lastRun: {
          outcome: 'failed',
          warning: 'execute',
          outcomeMsg: ['verification_exception: Unknown column [foo]'],
          alertsCount: {},
        },
      } as Partial<Rule>)
    );

    expect(diagnosis.id).toBe('execute');
    expect(diagnosis.severity).toBe('danger');
    expect(diagnosis.primaryAction).toBe('editRule');
    expect(diagnosis.secondaryActions).toEqual(['runRule', 'viewRuleDetails']);
    expect(diagnosis.messages).toEqual(['verification_exception: Unknown column [foo]']);
  });

  it('maps an unauthorized failure to update API key', () => {
    const [diagnosis] = diagnoseRule(
      buildRule({
        executionStatus: {
          status: 'error',
          error: { reason: 'unauthorized', message: 'security_exception: something new' },
        },
        lastRun: { outcome: 'failed', warning: 'unauthorized', outcomeMsg: null, alertsCount: {} },
      } as Partial<Rule>)
    );

    expect(diagnosis.id).toBe('unauthorized');
    expect(diagnosis.primaryAction).toBe('updateApiKey');
    expect(diagnosis.messages).toEqual(['security_exception: something new']);
  });

  it('refines an unauthorized failure with the UIAM code when present', () => {
    const [diagnosis] = diagnoseRule(
      buildRule({
        executionStatus: {
          status: 'error',
          error: {
            reason: 'unauthorized',
            message: 'failed to authenticate cloud API key: [0xD38358]',
          },
        },
        lastRun: { outcome: 'failed', warning: 'unauthorized', outcomeMsg: null, alertsCount: {} },
      } as Partial<Rule>)
    );

    expect(diagnosis.id).toBe('apiKeyRevoked');
    expect(diagnosis.primaryAction).toBe('updateApiKey');
  });

  it('maps forbidden, not found and unavailable failures', () => {
    const diagnose = (reason: string) =>
      diagnoseRule(
        buildRule({
          executionStatus: { status: 'error', error: { reason, message: 'm' } },
          lastRun: { outcome: 'failed', warning: reason, outcomeMsg: null, alertsCount: {} },
        } as Partial<Rule>)
      )[0];

    expect(diagnose('forbidden')).toEqual(
      expect.objectContaining({ id: 'forbidden', primaryAction: 'updateApiKey' })
    );
    expect(diagnose('notFound')).toEqual(
      expect.objectContaining({ id: 'notFound', primaryAction: 'editRule' })
    );
    expect(diagnose('unavailable')).toEqual(
      expect.objectContaining({ id: 'unavailable', primaryAction: 'runRule' })
    );
  });

  it('detects a missing UIAM API key (0x28D520) hidden behind an execute failure', () => {
    const message =
      'security_exception: failed to authenticate cloud API key: [0x28D520], caused by: "failed to authenticate cloud API key: [0x28D520]"';
    const [diagnosis] = diagnoseRule(
      buildRule({
        executionStatus: { status: 'error', error: { reason: 'execute', message } },
        lastRun: { outcome: 'failed', warning: 'execute', outcomeMsg: [message], alertsCount: {} },
      } as Partial<Rule>)
    );

    expect(diagnosis.id).toBe('apiKeyMissing');
    expect(diagnosis.severity).toBe('danger');
    expect(diagnosis.primaryAction).toBe('updateApiKey');
    expect(diagnosis.secondaryActions).toEqual(['runRule', 'viewRuleDetails']);
    expect(diagnosis.messages).toEqual([message]);
  });

  it('detects a revoked UIAM API key (0xD38358) from the execution status message', () => {
    const [diagnosis] = diagnoseRule(
      buildRule({
        executionStatus: {
          status: 'error',
          error: {
            reason: 'execute',
            message: 'security_exception: failed to authenticate cloud API key: [0xD38358]',
          },
        },
        lastRun: { outcome: 'failed', warning: 'execute', outcomeMsg: null, alertsCount: {} },
      } as Partial<Rule>)
    );

    expect(diagnosis.id).toBe('apiKeyRevoked');
    expect(diagnosis.primaryAction).toBe('updateApiKey');
  });

  it('detects an invalidated Elasticsearch API key without a UIAM code', () => {
    const [diagnosis] = diagnoseRule(
      buildRule({
        executionStatus: {
          status: 'error',
          error: { reason: 'execute', message: 'security_exception: api key has been invalidated' },
        },
        lastRun: { outcome: 'failed', warning: 'execute', outcomeMsg: null, alertsCount: {} },
      } as Partial<Rule>)
    );

    expect(diagnosis.id).toBe('apiKeyRevoked');
  });

  it('does not treat a successful run mentioning an auth code as an API key failure', () => {
    expect(
      diagnoseRule(
        buildRule({
          executionStatus: { status: 'ok' },
          lastRun: { outcome: 'succeeded', outcomeMsg: ['[0x28D520]'], alertsCount: {} },
        } as Partial<Rule>)
      )
    ).toEqual([]);
  });

  it('falls back to the execution status message when lastRun has no outcome message', () => {
    const [diagnosis] = diagnoseRule(
      buildRule({
        executionStatus: {
          status: 'error',
          error: { reason: 'decrypt', message: 'cannot decrypt' },
        },
        lastRun: { outcome: 'failed', warning: 'decrypt', outcomeMsg: null, alertsCount: {} },
      } as Partial<Rule>)
    );

    expect(diagnosis.id).toBe('decrypt');
    expect(diagnosis.primaryAction).toBe('updateApiKey');
    expect(diagnosis.messages).toEqual(['cannot decrypt']);
  });

  it('tolerates a plain string outcome message', () => {
    const [diagnosis] = diagnoseRule(
      buildRule({
        executionStatus: { status: 'error', error: { reason: 'unknown', message: 'test' } },
        lastRun: { outcome: 'failed', warning: 'unknown', outcomeMsg: 'test', alertsCount: {} },
      } as unknown as Partial<Rule>)
    );

    expect(diagnosis.id).toBe('unknown');
    expect(diagnosis.messages).toEqual(['test']);
  });

  it('maps a license error to manage license', () => {
    const [diagnosis] = diagnoseRule(
      buildRule({
        executionStatus: { status: 'error', error: { reason: 'license', message: 'nope' } },
        lastRun: { outcome: 'failed', warning: 'license', alertsCount: {} },
      } as Partial<Rule>)
    );

    expect(diagnosis.id).toBe('license');
    expect(diagnosis.primaryAction).toBe('manageLicense');
  });

  it('maps circuit breaker warnings to edit', () => {
    const [diagnosis] = diagnoseRule(
      buildRule({
        executionStatus: { status: 'warning', warning: { reason: 'maxAlerts', message: 'x' } },
        lastRun: { outcome: 'warning', warning: 'maxAlerts', alertsCount: {} },
      } as Partial<Rule>)
    );

    expect(diagnosis.id).toBe('maxAlerts');
    expect(diagnosis.severity).toBe('warning');
    expect(diagnosis.primaryAction).toBe('editRule');
  });

  it('offers enable when the rule was disabled mid-run and is still disabled', () => {
    const [diagnosis] = diagnoseRule(
      buildRule({
        enabled: false,
        executionStatus: { status: 'error', error: { reason: 'disabled', message: 'x' } },
        lastRun: { outcome: 'failed', warning: 'disabled', alertsCount: {} },
      } as Partial<Rule>)
    );

    expect(diagnosis.id).toBe('disabled');
    expect(diagnosis.primaryAction).toBe('enableRule');
  });

  it('offers run instead of enable when a disabled-reason rule is already enabled', () => {
    const [diagnosis] = diagnoseRule(
      buildRule({
        enabled: true,
        executionStatus: { status: 'error', error: { reason: 'disabled', message: 'x' } },
        lastRun: { outcome: 'failed', warning: 'disabled', alertsCount: {} },
      } as Partial<Rule>)
    );

    expect(diagnosis.primaryAction).toBe('runRule');
    expect(diagnosis.secondaryActions).toEqual([]);
  });

  it('returns a generic failure when no reason is recorded', () => {
    const [diagnosis] = diagnoseRule(
      buildRule({
        executionStatus: { status: 'error' },
        lastRun: { outcome: 'failed', outcomeMsg: ['boom'], alertsCount: {} },
      } as Partial<Rule>)
    );

    expect(diagnosis.id).toBe('failed');
    expect(diagnosis.primaryAction).toBe('runRule');
    expect(diagnosis.messages).toEqual(['boom']);
  });

  it('returns a generic warning when no reason is recorded', () => {
    const [diagnosis] = diagnoseRule(
      buildRule({
        executionStatus: { status: 'warning' },
        lastRun: { outcome: 'warning', alertsCount: {} },
      } as Partial<Rule>)
    );

    expect(diagnosis.id).toBe('warning');
    expect(diagnosis.primaryAction).toBe('viewRuleDetails');
  });

  it.each([MISSING_UIAM_API_KEY_TAG, LEGACY_MISSING_UIAM_API_KEY_TAG])(
    'adds a missing API key diagnosis for the "%s" tag even when the last run succeeded',
    (tag) => {
      const diagnoses = diagnoseRule(buildRule({ tags: ['team:a', tag] }));

      expect(diagnoses).toHaveLength(1);
      expect(diagnoses[0].id).toBe('missingApiKey');
      expect(diagnoses[0].primaryAction).toBe('updateApiKey');
    }
  );

  it('lists the last run problem before the missing API key problem', () => {
    const diagnoses = diagnoseRule(
      buildRule({
        tags: [MISSING_UIAM_API_KEY_TAG],
        executionStatus: { status: 'error', error: { reason: 'timeout', message: 'x' } },
        lastRun: { outcome: 'failed', warning: 'timeout', alertsCount: {} },
      } as Partial<Rule>)
    );

    expect(diagnoses.map(({ id }) => id)).toEqual(['timeout', 'missingApiKey']);
  });
});
