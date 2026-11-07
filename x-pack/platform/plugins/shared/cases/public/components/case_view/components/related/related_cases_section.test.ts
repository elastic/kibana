/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRelatedCaseRows } from './related_cases_section';

const summary = (id: string, reasons: Array<'linked' | 'alert'>, extra = {}) => ({
  id,
  title: `Case ${id}`,
  owner: 'securitySolution',
  incremental_id: 1,
  status: 'open',
  status_key: null,
  close_reason: null,
  ai_verdict: null,
  restricted: false,
  updated_at: '2026-11-06T10:00:00.000Z',
  reasons,
  shared_alert_ids: reasons.includes('alert') ? ['alert-1'] : [],
  ...extra,
});

describe('buildRelatedCaseRows', () => {
  it('merges reasons per case, keeps observable matching, and sorts linked first', () => {
    const rows = buildRelatedCaseRows({
      caseData: { id: 'case-0', aiVerdict: { verdict: 'true_positive' } } as never,
      related: [
        summary('case-2', ['alert'], { updated_at: '2026-11-06T12:00:00.000Z' }),
        summary('case-1', ['linked'], { ai_verdict: 'true_positive' }),
      ] as never,
      similar: [
        {
          id: 'case-2',
          title: 'Case case-2',
          status: 'open',
          similarities: { observables: [{ typeKey: 'host', value: 'fin-ws-07' }] },
        },
        {
          id: 'case-3',
          title: 'Case case-3',
          status: 'closed',
          similarities: { observables: [{ typeKey: 'user', value: 'svc-backup' }] },
        },
      ] as never,
    });

    expect(rows.map(({ id }) => id)).toEqual(['case-1', 'case-2', 'case-3']);
    expect(rows[0].reasons).toEqual(['linked', 'aiVerdict']);
    expect(rows[1].reasons).toEqual(['alert', 'observable']);
    expect(rows[1].reasonLabels).toEqual(['Alert: alert-1', 'Observable: fin-ws-07']);
    expect(rows[2]).toEqual(expect.objectContaining({ linked: false, reasons: ['observable'] }));
  });
});
