/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetActionOptionsParams } from './get_action_options';
import { CATEGORY_IDS, flattenOptions, getActionOptions } from './get_action_options';
import type { ActionCategory, ActionOptionData } from './types';
import { isActionCategory } from './types';

const baseParams: GetActionOptionsParams = {
  mode: 'template',
  bufferHasErrors: false,
  hasTargetField: true,
  targetControl: 'INPUT_TEXT',
  libraryFields: [{ fieldDefinitionId: 'def-1', name: 'Root_Cause' }],
  alreadyLinked: new Set<string>(),
  isLibraryLoading: false,
};

const getCategory = (options: ActionOptionData[], id: string): ActionCategory => {
  const category = options.find((option) => option.id === id);
  if (!category || !isActionCategory(category)) {
    throw new Error(`category ${id} not found`);
  }
  return category;
};

const leavesOf = (options: ActionOptionData[]) =>
  flattenOptions(options).filter((option) => !isActionCategory(option));

describe('getActionOptions', () => {
  it('propagates a disabled category state and reason to every leaf', () => {
    const options = getActionOptions({ ...baseParams, bufferHasErrors: true });
    const leaves = leavesOf(options);

    expect(leaves.length).toBeGreaterThan(0);
    for (const leaf of leaves) {
      expect(leaf.disabled).toBe(true);
      expect(leaf.disabledReason).toBe('Fix the YAML errors before using the actions menu');
    }
  });

  it('disables rule leaves (not field leaves) when the cursor is not on a field', () => {
    const options = getActionOptions({
      ...baseParams,
      hasTargetField: false,
      targetControl: undefined,
    });

    for (const leaf of getCategory(options, CATEGORY_IDS.conditional).options) {
      expect(leaf.disabled).toBe(true);
      expect(leaf.disabledReason).toBe('Place the cursor on a field to enable this action');
    }
    for (const leaf of getCategory(options, CATEGORY_IDS.newField).options) {
      expect(leaf.disabled).toBeFalsy();
    }
  });

  it.each(['template', 'fieldDefinition'] as const)(
    'leaves enabled rule categories without a disabled reason in %s mode',
    (mode) => {
      const options = getActionOptions({ ...baseParams, mode });
      const validation = getCategory(options, CATEGORY_IDS.validation);

      expect(validation.disabled).toBe(false);
      expect(validation.disabledReason).toBeUndefined();
      expect(validation.description).toBe('Add a validation rule to the selected field');
    }
  );

  it('marks a library field as linked case-insensitively', () => {
    const options = getActionOptions({ ...baseParams, alreadyLinked: new Set(['root_cause']) });
    const [libraryLeaf] = getCategory(options, CATEGORY_IDS.fieldLibrary).options;

    expect(libraryLeaf).toEqual(
      expect.objectContaining({ kind: 'libraryField', alreadyLinked: true, disabled: true })
    );
  });

  it('reports loading and error states for the library instead of an empty list', () => {
    const loading = getCategory(
      getActionOptions({ ...baseParams, isLibraryLoading: true }),
      CATEGORY_IDS.fieldLibrary
    );
    expect(loading.childrenStatus).toBe('loading');
    expect(loading.options).toEqual([]);

    const failed = getCategory(
      getActionOptions({ ...baseParams, isLibraryError: true }),
      CATEGORY_IDS.fieldLibrary
    );
    expect(failed.childrenStatus).toBe('error');

    const loaded = getCategory(getActionOptions(baseParams), CATEGORY_IDS.fieldLibrary);
    expect(loaded.childrenStatus).toBeUndefined();
    expect(loaded.options).toHaveLength(1);
  });

  it('uses the tablePlus icon for the field library', () => {
    expect(getCategory(getActionOptions(baseParams), CATEGORY_IDS.fieldLibrary).iconType).toBe(
      'tablePlus'
    );
  });
});
