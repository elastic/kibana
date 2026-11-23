/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseSeverity, CaseStatuses } from '../../../common/types/domain';
import type { MergeCaseSummary } from './use_merge_flyout_state';
import type { MergeFieldKey } from './utils';
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

  it('starts on a new case with nothing else chosen, closing the sources', () => {
    expect(initial).toMatchObject({
      mergeInto: 'new',
      destinationCaseId: undefined,
      choices: {},
      closeSources: true,
      step: 'cases',
    });
    expect([...initial.visitedSteps]).toEqual(['cases']);
    expect(isMergeFlyoutDirty(initial, initial)).toBe(false);
  });

  it('moves between steps, marking the passed ones visited, and keeps the field to focus', () => {
    const onReview = mergeFlyoutReducer(initial, {
      type: 'goTo',
      step: 'review',
      passed: ['differences', 'attachments'],
    });
    expect(onReview.step).toBe('review');
    expect([...onReview.visitedSteps]).toEqual(['cases', 'differences', 'attachments', 'review']);

    const editing = mergeFlyoutReducer(onReview, {
      type: 'goTo',
      step: 'differences',
      passed: [],
      focusField: 'title',
    });
    expect(editing).toMatchObject({ step: 'differences', focusField: 'title' });
    expect(isMergeFlyoutDirty(editing, initial)).toBe(false);
  });

  it('applies several choices at once and clears their review flags', () => {
    const reviewed = mergeFlyoutReducer(initial, {
      type: 'markForReview',
      keys: ['title', 'extendedFields.impact_as_keyword', 'severity'],
    });
    const custom = mergeFlyoutReducer(reviewed, {
      type: 'setCustomField',
      key: 'cf1',
      choice: { type: 'toggle', value: true },
    });
    const applied = mergeFlyoutReducer(custom, {
      type: 'applyChoices',
      choices: {
        title: 'Phishing',
        customFields: { cf2: { type: 'text', value: 'INC-1' } },
        extendedFields: { impact_as_keyword: 'High' },
      },
    });

    expect(applied.choices).toEqual({
      title: 'Phishing',
      customFields: {
        cf1: { type: 'toggle', value: true },
        cf2: { type: 'text', value: 'INC-1' },
      },
      extendedFields: { impact_as_keyword: 'High' },
    });
    expect([...applied.needsReview]).toEqual(['severity']);
  });

  it("clears a field's value, so it takes the server's default again", () => {
    const chosen = mergeFlyoutReducer(initial, {
      type: 'applyChoices',
      choices: {
        title: 'Phishing',
        customFields: { cf1: { type: 'toggle', value: true } },
        extendedFields: { impact_as_keyword: 'High', region_as_keyword: 'EMEA' },
      },
    });

    const keys: MergeFieldKey[] = ['title', 'customFields.cf1', 'extendedFields.impact_as_keyword'];
    const cleared = keys.reduce(
      (state, key) => mergeFlyoutReducer(state, { type: 'clearField', key }),
      chosen
    );

    expect(cleared.choices).toEqual({ extendedFields: { region_as_keyword: 'EMEA' } });
    expect(
      isMergeFlyoutDirty(
        mergeFlyoutReducer(cleared, {
          type: 'clearField',
          key: 'extendedFields.region_as_keyword',
        }),
        initial
      )
    ).toBe(false);
  });

  describe('AI reasons', () => {
    const resolved = mergeFlyoutReducer(initial, {
      type: 'applyAiResolution',
      choices: {
        title: 'Phishing wave',
        severity: CaseSeverity.HIGH,
        extendedFields: { impact_as_keyword: 'High' },
      },
      reasons: new Map<MergeFieldKey, string>([
        ['title', 'Covers both cases.'],
        ['severity', 'The highest.'],
        ['extendedFields.impact_as_keyword', 'Only #118 has one.'],
        // A reason for a field without a value is not kept.
        ['category', 'No value.'],
      ]),
    });

    it('applies the values and keeps a reason for each', () => {
      expect(resolved.choices).toEqual({
        title: 'Phishing wave',
        severity: CaseSeverity.HIGH,
        extendedFields: { impact_as_keyword: 'High' },
      });
      expect([...resolved.aiReasons.keys()]).toEqual([
        'title',
        'severity',
        'extendedFields.impact_as_keyword',
      ]);
      expect(isMergeFlyoutDirty(resolved, initial)).toBe(true);
    });

    it("drops a field's reason once the user changes it", () => {
      const edited = mergeFlyoutReducer(
        mergeFlyoutReducer(resolved, { type: 'setField', field: 'title', value: 'Mine' }),
        { type: 'setExtendedField', key: 'impact_as_keyword', value: 'Low' }
      );
      expect([...edited.aiReasons.keys()]).toEqual(['severity']);
    });

    it('drops the reasons of the fields a Fill sets', () => {
      const filled = mergeFlyoutReducer(resolved, {
        type: 'applyChoices',
        choices: { severity: CaseSeverity.LOW },
      });
      expect([...filled.aiReasons.keys()]).toEqual(['title', 'extendedFields.impact_as_keyword']);
    });

    it('replaces the reasons when the AI runs again', () => {
      const again = mergeFlyoutReducer(resolved, {
        type: 'applyAiResolution',
        choices: { title: 'Credential attacks' },
        reasons: new Map<MergeFieldKey, string>([['title', 'Better.']]),
      });
      expect(again.aiReasons.get('title')).toBe('Better.');
      expect(again.aiReasons.get('severity')).toBe('The highest.');
    });
  });

  it('merges into the first open case when the user cannot create cases', () => {
    expect(
      getInitialMergeFlyoutState({
        initialCases: [summary('closed', CaseStatuses.closed), summary('open')],
        canCreate: false,
      })
    ).toMatchObject({ mergeInto: 'existing', destinationCaseId: 'open' });
  });

  it('records where to merge, keeping the case to keep only for an existing case', () => {
    const existing = mergeFlyoutReducer(initial, { type: 'setMergeInto', mergeInto: 'existing' });
    expect(existing).toMatchObject({ mergeInto: 'existing', destinationCaseId: undefined });
    expect(isMergeFlyoutDirty(existing, initial)).toBe(true);

    const kept = mergeFlyoutReducer(existing, { type: 'setDestination', caseId: 'case-2' });
    expect(kept).toMatchObject({ mergeInto: 'existing', destinationCaseId: 'case-2' });

    const fresh = mergeFlyoutReducer(kept, { type: 'setMergeInto', mergeInto: 'new' });
    expect(fresh).toMatchObject({ mergeInto: 'new', destinationCaseId: undefined });
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
