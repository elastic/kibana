/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseSeverity, CaseStatuses } from '../../../common/types/domain';
import type { MergeCaseSummary } from './use_merge_flyout_state';
import {
  getInitialMergeFlyoutState,
  isMergeFlyoutDirty,
  mergeFlyoutReducer,
} from './use_merge_flyout_state';

const summary = (id: string, status = CaseStatuses.open): MergeCaseSummary => ({
  id,
  title: id,
  incrementalId: null,
  status,
  severity: CaseSeverity.LOW,
  totalAlerts: 0,
  owner: 'securitySolution',
});

describe('mergeFlyoutReducer', () => {
  const initial = getInitialMergeFlyoutState({
    initialCases: [summary('case-1'), summary('case-2')],
    canCreate: true,
  });

  it('starts on a new case, closing the sources, with nothing chosen', () => {
    expect(initial).toMatchObject({
      destinationCaseId: undefined,
      choices: {},
      closeSources: true,
      note: null,
    });
    expect(isMergeFlyoutDirty(initial, initial)).toBe(false);
  });

  it('merges into the first open case when the user cannot create cases', () => {
    expect(
      getInitialMergeFlyoutState({
        initialCases: [summary('closed', CaseStatuses.closed), summary('open')],
        canCreate: false,
      }).destinationCaseId
    ).toBe('open');
  });

  it('records a choice and clears its review flag', () => {
    const reviewed = mergeFlyoutReducer(initial, { type: 'markForReview', keys: ['title'] });
    expect(reviewed.showChangedNotice).toBe(true);

    const chosen = mergeFlyoutReducer(reviewed, {
      type: 'setField',
      field: 'title',
      value: 'Phishing',
    });
    expect(chosen.choices).toEqual({ title: 'Phishing' });
    expect(chosen.needsReview.has('title')).toBe(false);
    expect(isMergeFlyoutDirty(chosen, initial)).toBe(true);
  });

  it('records custom and template field choices by key', () => {
    const custom = mergeFlyoutReducer(initial, {
      type: 'setCustomField',
      key: 'cf1',
      choice: { type: 'toggle', value: true },
    });
    const extended = mergeFlyoutReducer(custom, {
      type: 'setExtendedField',
      key: 'verdict_as_keyword',
      value: 'malicious',
    });

    expect(extended.choices).toEqual({
      customFields: { cf1: { type: 'toggle', value: true } },
      extendedFields: { verdict_as_keyword: 'malicious' },
    });
  });

  it('adds a case once and clears the destination when it is removed', () => {
    const added = mergeFlyoutReducer(initial, { type: 'addCase', theCase: summary('case-3') });
    expect(added.cases.map(({ id }) => id)).toEqual(['case-1', 'case-2', 'case-3']);
    expect(mergeFlyoutReducer(added, { type: 'addCase', theCase: summary('case-3') })).toBe(added);

    const withDestination = mergeFlyoutReducer(added, { type: 'setDestination', caseId: 'case-3' });
    const removed = mergeFlyoutReducer(withDestination, { type: 'removeCase', caseId: 'case-3' });
    expect(removed.destinationCaseId).toBeUndefined();
  });

  it('adds no more than ten cases', () => {
    const full = getInitialMergeFlyoutState({
      initialCases: Array.from({ length: 10 }, (_, index) => summary(`case-${index}`)),
      canCreate: true,
    });
    expect(mergeFlyoutReducer(full, { type: 'addCase', theCase: summary('case-11') })).toBe(full);
  });
});
