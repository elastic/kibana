/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildLifecycleViewQuery } from './build_lifecycle_view';

describe('buildLifecycleViewQuery', () => {
  it('emits a stable query for the securitySolution owner', () => {
    expect(buildLifecycleViewQuery('securitySolution')).toMatchSnapshot();
  });

  it('scopes by owner in the WHERE clause', () => {
    expect(buildLifecycleViewQuery('securitySolution')).toContain(
      '| WHERE type == "cases" AND cases.owner == "securitySolution"'
    );
    expect(buildLifecycleViewQuery('observability')).toContain(
      'cases.owner == "observability"'
    );
  });

  it('reads from cases SOs only — total_* and time_to_* are already maintained on the case doc, no aggregation needed', () => {
    const out = buildLifecycleViewQuery('securitySolution');
    expect(out).not.toContain('cases-comments');
    expect(out).not.toContain('| STATS');
  });

  it('computes time_to_close_ms inline from closed_at - created_at so consumers do not have to', () => {
    expect(buildLifecycleViewQuery('securitySolution')).toContain(
      'time_to_close_ms = TO_LONG(TO_DATETIME(cases.closed_at)) - TO_LONG(TO_DATETIME(cases.created_at))'
    );
  });

  it('decodes status and severity to strings (lifecycle dashboards group on these labels, not the numeric codes)', () => {
    const out = buildLifecycleViewQuery('securitySolution');
    expect(out).toContain('status = CASE(cases.status == 0, "open"');
    expect(out).toContain('severity = CASE(cases.severity == 0, "low"');
  });
});
