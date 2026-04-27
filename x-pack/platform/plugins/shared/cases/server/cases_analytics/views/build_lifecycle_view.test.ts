/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildLifecycleViewQuery } from './build_lifecycle_view';

describe('buildLifecycleViewQuery', () => {
  it('emits a stable query (no parameters; one row per case)', () => {
    expect(buildLifecycleViewQuery()).toMatchSnapshot();
  });

  it('reads from cases SOs only — total_* and time_to_* are already maintained on the case doc, no aggregation needed', () => {
    const out = buildLifecycleViewQuery();
    expect(out).toContain('| WHERE type == "cases"');
    expect(out).not.toContain('cases-comments');
    expect(out).not.toContain('| STATS');
  });

  it('computes time_to_close_ms inline from closed_at - created_at so consumers do not have to', () => {
    expect(buildLifecycleViewQuery()).toContain(
      'time_to_close_ms = TO_LONG(TO_DATETIME(cases.closed_at)) - TO_LONG(TO_DATETIME(cases.created_at))'
    );
  });

  it('decodes status and severity to strings (lifecycle dashboards group on these labels, not the numeric codes)', () => {
    const out = buildLifecycleViewQuery();
    expect(out).toContain('status = CASE(cases.status == 0, "open"');
    expect(out).toContain('severity = CASE(cases.severity == 0, "low"');
  });
});
