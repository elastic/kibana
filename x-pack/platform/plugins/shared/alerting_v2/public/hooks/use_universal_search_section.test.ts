/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  useUniversalSearchSection,
  type UniversalSearchSectionHandlers,
} from './use_universal_search_section';

let mockCanWriteRules = true;
let mockExperimentalFeaturesEnabled = true;

jest.mock('@kbn/core-di-browser', () => ({
  ...jest.requireActual('@kbn/core-di-browser'),
  useService: () => ({
    canWrite: (feature: string) => (feature === 'rules' ? mockCanWriteRules : false),
  }),
}));

jest.mock('./use_alerting_v2_experimental_features', () => ({
  useAlertingV2ExperimentalFeatures: () => mockExperimentalFeaturesEnabled,
}));

describe('useUniversalSearchSection', () => {
  const onCreateEsqlRule = jest.fn();
  const onCreateThresholdRule = jest.fn();
  const onBuildSequence = jest.fn();

  const defaultHandlers: UniversalSearchSectionHandlers = {
    onCreateEsqlRule,
    onCreateThresholdRule,
    onBuildSequence,
  };

  const runHook = (query: string, handlers: UniversalSearchSectionHandlers = defaultHandlers) =>
    renderHook(() => useUniversalSearchSection(query, handlers)).result.current;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCanWriteRules = true;
    mockExperimentalFeaturesEnabled = true;
  });

  it('returns no items for an empty or whitespace-only query', () => {
    expect(runHook('')).toEqual({ items: [], isLoading: false });
    expect(runHook('   ')).toEqual({ items: [], isLoading: false });
  });

  it('matches the threshold option by partial title and description case-insensitively', () => {
    const result = runHook('threshol');
    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'threshold',
        title: 'Monitor a threshold',
        description: 'Guided builder for counts and metric thresholds',
        iconType: 'puzzlePiece',
      }),
    ]);
    expect(runHook('METRIC').items.map((item) => item.id)).toEqual(['threshold']);
    expect(runHook('counts').items.map((item) => item.id)).toEqual(['threshold']);
  });

  it.each(['es|ql', 'esql', 'ESQL', 'ES|QL', 'query', '|'])(
    'matches the ES|QL option for query %s',
    (query) => {
      const result = runHook(query);

      expect(result.items.map((item) => item.id)).toEqual(['esql']);
      expect(result.isLoading).toBe(false);
      expect(result.headerAction).toBeUndefined();
    }
  );

  it('returns matching options in catalog order', () => {
    const result = runHook('guided builder');

    expect(result.items.map((item) => item.id)).toEqual(['threshold', 'sequence']);
  });

  it('returns no items when nothing matches', () => {
    expect(runHook('alert on cpu')).toEqual({ items: [], isLoading: false });
  });

  it('invokes the corresponding handler when an item is selected', () => {
    runHook('threshol').items[0].onSelect();
    runHook('sequence').items[0].onSelect();
    runHook('esql').items[0].onSelect();

    expect(onCreateThresholdRule).toHaveBeenCalledTimes(1);
    expect(onBuildSequence).toHaveBeenCalledTimes(1);
    expect(onCreateEsqlRule).toHaveBeenCalledTimes(1);
  });

  it('hides the sequence option when experimental features are disabled', () => {
    mockExperimentalFeaturesEnabled = false;

    expect(runHook('sequence').items).toEqual([]);
    expect(runHook('guided builder').items.map((item) => item.id)).toEqual(['threshold']);
  });

  it('hides the sequence option when onBuildSequence is not provided', () => {
    const handlersWithoutSequence: UniversalSearchSectionHandlers = {
      onCreateEsqlRule,
      onCreateThresholdRule,
    };

    expect(runHook('sequence', handlersWithoutSequence).items).toEqual([]);
    expect(runHook('guided builder', handlersWithoutSequence).items.map((item) => item.id)).toEqual(
      ['threshold']
    );
  });

  it('hides the entire section when the user lacks rules write privilege', () => {
    mockCanWriteRules = false;

    expect(runHook('threshol')).toEqual({ items: [], isLoading: false });
    expect(runHook('esql')).toEqual({ items: [], isLoading: false });
    expect(runHook('sequence')).toEqual({ items: [], isLoading: false });
  });
});
