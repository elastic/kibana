/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildActivityViewQuery } from './build_activity_view';

describe('buildActivityViewQuery', () => {
  it('emits a stable query (no parameters; output never varies)', () => {
    expect(buildActivityViewQuery()).toMatchSnapshot();
  });

  it('filters to cases-user-actions SOs and pulls the user-action metadata required for activity dashboards', () => {
    const out = buildActivityViewQuery();
    expect(out).toContain('| WHERE type == "cases-user-actions"');
    expect(out).toContain('action = `cases-user-actions`.action');
    expect(out).toContain('user_action_type = `cases-user-actions`.type');
  });

  it('preserves the payload only for matching user_action_type so consumers can SUM/COUNT by intent without ambiguity', () => {
    const out = buildActivityViewQuery();
    expect(out).toContain(
      'payload_status = CASE(`cases-user-actions`.type == "status", `cases-user-actions`.payload.status, null)'
    );
    expect(out).toContain(
      'payload_severity = CASE(`cases-user-actions`.type == "severity", `cases-user-actions`.payload.severity, null)'
    );
  });

  it('exposes case_id from the SO references array for joining back to cases.case rows', () => {
    expect(buildActivityViewQuery()).toContain('case_id = MV_FIRST(MV_FILTER(references.id');
  });
});
