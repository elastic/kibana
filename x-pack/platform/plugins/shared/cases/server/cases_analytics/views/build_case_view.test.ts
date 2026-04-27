/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCaseViewQuery } from './build_case_view';

describe('buildCaseViewQuery', () => {
  it('emits a stable query for the empty template-fields set', () => {
    expect(buildCaseViewQuery([])).toMatchSnapshot();
  });

  it('appends one EVAL and one KEEP column per template field, after the base columns, in input order', () => {
    const out = buildCaseViewQuery([
      { name: 'riskScore', type: 'long' },
      { name: 'incidentDate', type: 'date' },
      { name: 'summary', type: 'keyword' },
    ]);
    expect(out).toMatchSnapshot();
  });

  it('reads from the alerting-cases SO index with the type filter and metadata directives required by JSON_EXTRACT', () => {
    const out = buildCaseViewQuery([]);
    expect(out).toMatch(/^FROM \.kibana_alerting_cases METADATA _id, _source/);
    expect(out).toContain('| WHERE type == "cases"');
  });

  it('decodes status and severity numeric codes inline so consumers do not need to know the enum encoding', () => {
    const out = buildCaseViewQuery([]);
    expect(out).toContain(
      'status = CASE(cases.status == 0, "open", cases.status == 10, "in-progress", cases.status == 20, "closed", "")'
    );
    expect(out).toContain(
      'severity = CASE(cases.severity == 0, "low", cases.severity == 10, "medium", cases.severity == 20, "high", cases.severity == 30, "critical", "")'
    );
  });

  it('exposes both ISO and ms-epoch forms for created_at, updated_at, and closed_at', () => {
    const out = buildCaseViewQuery([]);
    expect(out).toContain('created_at = TO_DATETIME(cases.created_at)');
    expect(out).toContain('created_at_ms = TO_LONG(TO_DATETIME(cases.created_at))');
    expect(out).toContain('closed_at_ms = TO_LONG(TO_DATETIME(cases.closed_at))');
  });

  it('flattens assignees, custom_fields, and observables to multi-value columns rather than nested rows', () => {
    const out = buildCaseViewQuery([]);
    expect(out).toContain('assignees = cases.assignees.uid');
    expect(out).toContain('total_assignees = MV_COUNT(cases.assignees.uid)');
    expect(out).toContain('custom_fields_keys = cases.customFields.key');
    expect(out).toContain('observables_types = cases.observables.typeKey');
  });
});
