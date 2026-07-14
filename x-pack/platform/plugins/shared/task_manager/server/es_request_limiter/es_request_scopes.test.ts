/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ES_REQUEST_SCOPE_GROUPS,
  KNOWN_ES_REQUEST_SCOPES,
  resolveEsRequestScope,
} from './es_request_scopes';

describe('resolveEsRequestScope', () => {
  it('resolves alerting v1 rule executor task types to the alerting scope', () => {
    expect(resolveEsRequestScope('alerting:.es-query')).toBe('alerting');
    expect(resolveEsRequestScope('alerting:xpack.uptime.alerts.monitorStatus')).toBe('alerting');
  });

  it('resolves the alerting v2 rule executor to its own scope, without colliding with v1', () => {
    expect(resolveEsRequestScope('alerting_v2:rule_executor')).toBe('alerting_v2');
    // the v1 `alerting:` prefix must not grab the v2 task type
    expect(resolveEsRequestScope('alerting_v2:rule_executor')).not.toBe('alerting');
    // other alerting_v2 tasks are infra, not rules, so they stay unscoped
    expect(resolveEsRequestScope('alerting_v2:dispatcher')).toBeUndefined();
    expect(resolveEsRequestScope('alerting_v2:telemetry')).toBeUndefined();
  });

  it('resolves action executor task types to the actions scope', () => {
    expect(resolveEsRequestScope('actions:.email')).toBe('actions');
  });

  it('resolves exact test task types', () => {
    expect(resolveEsRequestScope('sampleTaskWithScopedEsRequestLimit')).toBe(
      'sampleEsRequestScope'
    );
  });

  it('returns undefined for task types that are not grouped', () => {
    expect(resolveEsRequestScope('report:execute')).toBeUndefined();
    expect(resolveEsRequestScope('some-random-task')).toBeUndefined();
    // a prefix must match at the start, not anywhere in the string
    expect(resolveEsRequestScope('not-alerting:foo')).toBeUndefined();
  });
});

describe('KNOWN_ES_REQUEST_SCOPES', () => {
  it('lists every group scope exactly once', () => {
    const scopes = ES_REQUEST_SCOPE_GROUPS.map((group) => group.scope);
    expect([...KNOWN_ES_REQUEST_SCOPES].sort()).toEqual([...new Set(scopes)].sort());
    expect(KNOWN_ES_REQUEST_SCOPES.length).toBe(new Set(KNOWN_ES_REQUEST_SCOPES).size);
  });

  it('includes the alerting, alerting_v2, and actions scopes', () => {
    expect(KNOWN_ES_REQUEST_SCOPES).toContain('alerting');
    expect(KNOWN_ES_REQUEST_SCOPES).toContain('alerting_v2');
    expect(KNOWN_ES_REQUEST_SCOPES).toContain('actions');
  });
});
