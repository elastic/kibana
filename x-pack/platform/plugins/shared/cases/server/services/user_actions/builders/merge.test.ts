/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserActionParameters } from '../types';
import { MergeUserActionBuilder } from './merge';

describe('MergeUserActionBuilder', () => {
  const payload = {
    merge: {
      destination: { id: 'destination-id', title: 'Phishing', incrementalId: 142 },
      sources: [
        {
          id: 'case-1',
          title: 'Phishing email',
          incrementalId: 118,
          outcome: 'merged' as const,
          closed: true,
          copied: { alerts: 2, events: 0, attacks: 0, observables: 1, other: 0 },
          existing: { alerts: 1, events: 0, attacks: 0, observables: 0, other: 0 },
          leftOut: { alerts: 0, events: 0, attacks: 0, observables: 0, other: 0 },
        },
      ],
      updatedFields: [{ field: 'severity' as const }],
      notCopiedFields: [{ key: 'region_as_keyword', label: 'region' }],
    },
  };

  const builderArgs: UserActionParameters<'merge'> = {
    action: 'update' as const,
    caseId: 'case-1',
    user: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic User',
      username: 'elastic',
    },
    owner: 'securitySolution',
    payload,
  };

  let builder: MergeUserActionBuilder;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2022-01-09T22:00:00.000Z'));
  });

  beforeEach(() => {
    builder = new MergeUserActionBuilder();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('builds an update action of type merge with the full payload', () => {
    const { parameters } = builder.build(builderArgs);

    expect(parameters.attributes).toEqual(
      expect.objectContaining({ action: 'update', type: 'merge', payload })
    );
  });

  it('references only the case the action is recorded on', () => {
    const { parameters } = builder.build(builderArgs);

    expect(parameters.references).toEqual([
      expect.objectContaining({ type: 'cases', id: 'case-1' }),
    ]);
  });

  it('describes the action for the audit log', () => {
    const { eventDetails } = builder.build(builderArgs);

    expect(eventDetails.descriptiveAction).toBe('case_user_action_merge_cases');
    expect(eventDetails.getMessage('action-id')).toContain('case-1');
  });
});
