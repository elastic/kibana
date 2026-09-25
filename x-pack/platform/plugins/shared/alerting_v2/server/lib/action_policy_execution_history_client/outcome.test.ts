/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { policyExecutionOutcomeSchema } from '@kbn/alerting-v2-schemas';
import {
  ALL_SURFACED_EVENT_ACTIONS,
  isSurfacedEventAction,
  toEventActions,
  toPolicyExecutionOutcome,
} from './outcome';

describe('isSurfacedEventAction', () => {
  it('accepts the dispatch actions the API reports', () => {
    expect(isSurfacedEventAction('dispatched')).toBe(true);
    expect(isSurfacedEventAction('throttled')).toBe(true);
    expect(isSurfacedEventAction('dispatch_failed')).toBe(true);
  });

  it('rejects unmatched and other strings', () => {
    expect(isSurfacedEventAction('unmatched')).toBe(false);
    expect(isSurfacedEventAction('foo')).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(isSurfacedEventAction(undefined)).toBe(false);
    expect(isSurfacedEventAction(null)).toBe(false);
    expect(isSurfacedEventAction(42)).toBe(false);
  });

  it('rejects inherited object properties', () => {
    expect(isSurfacedEventAction('toString')).toBe(false);
  });
});

describe('toPolicyExecutionOutcome', () => {
  it('projects each stored action onto its outcome', () => {
    expect(toPolicyExecutionOutcome('dispatched')).toBe('success');
    expect(toPolicyExecutionOutcome('throttled')).toBe('throttled');
    expect(toPolicyExecutionOutcome('dispatch_failed')).toBe('failure');
  });
});

describe('toEventActions', () => {
  it('resolves each outcome to the action it selects', () => {
    expect(toEventActions(['success'])).toEqual(['dispatched']);
    expect(toEventActions(['throttled'])).toEqual(['throttled']);
    expect(toEventActions(['failure'])).toEqual(['dispatch_failed']);
    expect(toEventActions(['success', 'failure'])).toEqual(['dispatched', 'dispatch_failed']);
  });

  it('leaves the filter unset when no outcome is requested', () => {
    expect(toEventActions(undefined)).toBeUndefined();
    expect(toEventActions([])).toBeUndefined();
  });
});

describe('the outcome and action vocabularies', () => {
  it('round-trip through each other', () => {
    for (const action of ALL_SURFACED_EVENT_ACTIONS) {
      expect(toEventActions([toPolicyExecutionOutcome(action)])).toEqual([action]);
    }
  });

  it('cover every outcome the schema accepts', () => {
    expect(ALL_SURFACED_EVENT_ACTIONS.map(toPolicyExecutionOutcome).sort()).toEqual(
      [...policyExecutionOutcomeSchema.options].sort()
    );
  });
});
