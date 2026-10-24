/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { GetActionOptionsParams } from './get_action_options';
import { getActionOptions } from './get_action_options';
import type { ActionOptionData } from './types';
import { getOptionAction } from './types';
import { useDisplayOptions } from './use_display_options';

const baseParams: GetActionOptionsParams = {
  mode: 'template',
  bufferHasErrors: false,
  hasTargetField: true,
  targetControl: 'INPUT_TEXT',
  libraryFields: [{ fieldDefinitionId: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6', name: 'impact' }],
  alreadyLinked: new Set<string>(),
  isLibraryLoading: false,
};

const search = (catalog: ActionOptionData[], searchTerm: string) =>
  renderHook(() =>
    useDisplayOptions({
      options: catalog,
      categoryTree: catalog,
      searchTerm,
      currentPath: [],
      testSubjPrefix: 'menu',
    })
  ).result.current;

const actionsOf = (catalog: ActionOptionData[], searchTerm: string) =>
  search(catalog, searchTerm)
    .filter((option) => !option.isGroupLabel)
    .map((option) => ({ option, action: getOptionAction(option) }));

describe('useDisplayOptions', () => {
  it('lists root categories under section headers when not searching', () => {
    const result = search(getActionOptions(baseParams), '');
    expect(result.map((option) => option.label)).toEqual([
      'Add field',
      'New field',
      'Field library',
      'Field rules',
      'Validation',
      'Conditional logic',
    ]);
  });

  it('disables search results whose category is disabled', () => {
    const results = actionsOf(getActionOptions({ ...baseParams, bufferHasErrors: true }), 'text');

    expect(results.length).toBeGreaterThan(0);
    for (const { option } of results) {
      expect(option.disabled).toBe(true);
    }
  });

  it('keeps search results enabled when their category is enabled', () => {
    const results = actionsOf(getActionOptions(baseParams), 'text input');
    expect(results.map(({ action }) => action?.label)).toContain('Text Input');
    expect(results.every(({ option }) => !option.disabled)).toBe(true);
  });

  it('does not match on internal ids', () => {
    const catalog = getActionOptions(baseParams);
    expect(actionsOf(catalog, 'fieldType')).toEqual([]);
    expect(actionsOf(catalog, 'f81d4fae')).toEqual([]);
    expect(actionsOf(catalog, 'library:')).toEqual([]);
  });

  it('prefixes leaf descriptions with their parent category', () => {
    const [{ action }] = actionsOf(getActionOptions(baseParams), 'impact');
    expect(action?.description).toBe('Field library — impact');
  });
});
