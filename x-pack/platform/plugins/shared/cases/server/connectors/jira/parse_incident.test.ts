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
      updatedAt: undefined,
    });
  });
});
