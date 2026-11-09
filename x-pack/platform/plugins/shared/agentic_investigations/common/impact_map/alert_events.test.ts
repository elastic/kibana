/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertSubjectsToImpactMapEvents, appliedProposalsToImpactMapEvents } from './events';

describe('alertSubjectsToImpactMapEvents', () => {
  it('turns the alerts of an investigation into alert events and leaves other subjects out', () => {
    const events = alertSubjectsToImpactMapEvents([
      {
        subjectType: 'alert',
        subjectId: 'a1',
        createdAt: '2026-11-07T17:10:00Z',
        snapshot: {
          rule_name: 'Shipping replicas low',
          reason: 'Replicas fell to 0',
          start: '2026-11-07T16:58:44Z',
          url: 'https://kibana.example/alert/a1',
        },
      },
      { subjectType: 'slack_thread', subjectId: 't1', createdAt: '2026-11-07T17:10:00Z' },
    ]);

    expect(events).toEqual([
      {
        id: 'alert:a1',
        kind: 'alert',
        title: 'Shipping replicas low',
        description: '- Replicas fell to 0',
        at: '2026-11-07T16:58:44Z',
        links: [{ label: 'Shipping replicas low', url: 'https://kibana.example/alert/a1' }],
      },
    ]);
  });

  it('falls back to the summary, the id and the time the alert was attached', () => {
    const [event] = alertSubjectsToImpactMapEvents([
      { subjectType: 'alert', subjectId: 'a2', createdAt: '2026-11-07T17:10:00Z' },
    ]);

    expect(event).toMatchObject({ title: 'a2', at: '2026-11-07T17:10:00Z' });
  });

  it('does not link a url that is not http or https', () => {
    const [event] = alertSubjectsToImpactMapEvents([
      {
        subjectType: 'alert',
        subjectId: 'a3',
        createdAt: '2026-11-07T17:10:00Z',
        snapshot: { url: 'ftp://files.example/alert' },
      },
    ]);

    expect(event).not.toHaveProperty('links');
  });
});

describe('appliedProposalsToImpactMapEvents', () => {
  const todo = {
    id: 'p1',
    title: 'Restore shipping to at least 1 replica',
    comment: 'Scale the deployment back up and confirm recovery.',
    category: 'todo',
    decision: 'approved' as const,
    decided_at: '2026-11-08T12:30:00Z',
  };

  it('shows a to-do marked as applied as a response event at the time it was marked', () => {
    expect(appliedProposalsToImpactMapEvents([todo])).toEqual([
      {
        id: 'proposal:p1',
        kind: 'response',
        title: 'Applied: Restore shipping to at least 1 replica',
        description: '- Scale the deployment back up and confirm recovery.',
        at: '2026-11-08T12:30:00Z',
      },
    ]);
  });

  it('leaves out proposals that are undecided, dismissed or not to-dos', () => {
    expect(
      appliedProposalsToImpactMapEvents([
        { ...todo, id: 'p2', decision: undefined, decided_at: undefined },
        { ...todo, id: 'p3', decision: 'dismissed' as const },
        { ...todo, id: 'p4', category: 'remediation' },
      ])
    ).toEqual([]);
  });
});
