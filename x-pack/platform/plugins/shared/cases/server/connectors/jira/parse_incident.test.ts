/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '../../../common/types/domain';
import { parseIncident } from './parse_incident';

describe('jira parseIncident', () => {
  it('maps summary, description, status category and updated', () => {
    expect(
      parseIncident({
        id: '10000',
        key: 'RJ-1',
        summary: 'A title',
        description: 'A description',
        status: { name: 'In Review', statusCategory: { key: 'indeterminate' } },
        updated: '2026-09-30T10:00:00.000+0000',
      })
    ).toEqual({
      title: 'A title',
      description: 'A description',
      status: CaseStatuses['in-progress'],
      updatedAt: '2026-09-30T10:00:00.000+0000',
    });
  });

  it.each([
    ['new', CaseStatuses.open],
    ['done', CaseStatuses.closed],
  ])('maps the %s status category', (key, status) => {
    expect(parseIncident({ status: { statusCategory: { key } } }).status).toBe(status);
  });

  it('leaves fields undefined when the incident does not carry them', () => {
    expect(parseIncident({ summary: 1, description: null, status: 'Done' })).toEqual({
      title: undefined,
      description: undefined,
      status: undefined,
      tags: undefined,
      comments: undefined,
      updatedAt: undefined,
    });
  });

  it('maps labels to tags, keeping only strings', () => {
    expect(parseIncident({ labels: ['phishing', 7, 'soc-l2'] }).tags).toEqual([
      'phishing',
      'soc-l2',
    ]);
  });

  it('maps the comments with their author and timestamps', () => {
    expect(
      parseIncident({
        comment: {
          comments: [
            {
              id: '20001',
              body: 'Looking into it',
              author: { displayName: 'Jane Smith', emailAddress: 'jane@example.com' },
              created: '2026-10-01T10:00:00.000+0000',
              updated: '2026-10-01T10:05:00.000+0000',
            },
            { id: '20002', body: 'No author' },
            { id: 3, body: 'bad id is dropped' },
          ],
        },
      }).comments
    ).toEqual([
      {
        externalId: '20001',
        body: 'Looking into it',
        author: { name: 'Jane Smith', email: 'jane@example.com' },
        createdAt: '2026-10-01T10:00:00.000+0000',
        updatedAt: '2026-10-01T10:05:00.000+0000',
      },
      { externalId: '20002', body: 'No author' },
    ]);
  });
});
