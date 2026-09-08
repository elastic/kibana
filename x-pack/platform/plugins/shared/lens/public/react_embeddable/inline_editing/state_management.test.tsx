/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypedLensSerializedState } from '@kbn/lens-common';
import { getStateManagementForInlineEditing } from './state_management';
import { mergeToNewDoc } from '../../state_management/shared_logic';

jest.mock('../../state_management/shared_logic', () => ({
  mergeToNewDoc: jest.fn(() => ({ state: {} })),
}));

describe('getStateManagementForInlineEditing', () => {
  const attributes = {
    visualizationType: 'testVis',
    state: {
      datasourceStates: { textBased: {} },
      query: { query: '', language: 'kuery' },
      filters: [],
    },
  } as unknown as TypedLensSerializedState['attributes'];

  it('filters out loading/uninitialized datasource states and keeps the active one', () => {
    const { updatePanelState } = getStateManagementForInlineEditing(
      'textBased',
      () => attributes,
      jest.fn(),
      {},
      {},
      jest.fn()
    );

    updatePanelState('newDatasourceState', 'newVisState', 'testVis', 'textBased', {
      formBased: { isLoading: true, state: null },
      textBased: { isLoading: false, state: 'newDatasourceState' },
    });

    expect(mergeToNewDoc).toHaveBeenCalledWith(
      attributes,
      expect.anything(),
      { textBased: { isLoading: false, state: 'newDatasourceState' } },
      expect.anything(),
      expect.anything(),
      'textBased',
      expect.anything(),
      expect.anything()
    );
  });

  it('places the active datasource state as the first key so it is re-derived as active on reload', () => {
    const { updatePanelState } = getStateManagementForInlineEditing(
      'textBased',
      () => attributes,
      jest.fn(),
      {},
      {},
      jest.fn()
    );

    updatePanelState('activeState', 'newVisState', 'testVis', 'textBased', {
      formBased: { isLoading: false, state: 'formBasedState' },
      textBased: { isLoading: false, state: 'activeState' },
    });

    const [, , passedDatasourceStates] = jest.mocked(mergeToNewDoc).mock.lastCall!;
    expect(Object.keys(passedDatasourceStates)).toEqual(['textBased', 'formBased']);
  });

  it('serializes only the active datasource state when allDatasourceStates is not passed (legacy 4-arg call)', () => {
    const { updatePanelState } = getStateManagementForInlineEditing(
      'textBased',
      () => attributes,
      jest.fn(),
      {},
      {},
      jest.fn()
    );

    updatePanelState('activeState', 'newVisState', 'testVis', 'textBased');

    expect(mergeToNewDoc).toHaveBeenCalledWith(
      attributes,
      expect.anything(),
      { textBased: { isLoading: false, state: 'activeState' } },
      expect.anything(),
      expect.anything(),
      'textBased',
      expect.anything(),
      expect.anything()
    );
  });

  it('always includes the active datasource state even if the slice entry is loading', () => {
    const { updatePanelState } = getStateManagementForInlineEditing(
      'textBased',
      () => attributes,
      jest.fn(),
      {},
      {},
      jest.fn()
    );

    updatePanelState('activeState', 'newVisState', 'testVis', 'textBased', {
      textBased: { isLoading: true, state: null },
    });

    expect(mergeToNewDoc).toHaveBeenCalledWith(
      attributes,
      expect.anything(),
      { textBased: { isLoading: false, state: 'activeState' } },
      expect.anything(),
      expect.anything(),
      'textBased',
      expect.anything(),
      expect.anything()
    );
  });
});
