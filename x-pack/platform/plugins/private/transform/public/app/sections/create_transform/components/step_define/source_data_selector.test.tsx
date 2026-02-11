/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// @ts-nocheck

import React from 'react';
import { fireEvent, render } from '@testing-library/react';

import { SourceDataSelector } from './source_data_selector';

jest.mock('@kbn/saved-objects-finder-plugin/public', () => ({
  SavedObjectFinder: ({ onChoose }) => (
    <div>
      <button data-test-subj="mockChooseDataView" onClick={() => onChoose('dv-1', 'index-pattern')}>
        choose data view
      </button>
      <button data-test-subj="mockChooseDiscoverSession" onClick={() => onChoose('ss-1', 'search')}>
        choose discover session
      </button>
    </div>
  ),
}));

jest.mock('../../../../app_dependencies', () => ({
  useAppDependencies: () => ({
    contentManagement: { client: {} },
    uiSettings: {},
    dataViewEditor: undefined,
  }),
}));

describe('Transform: <SourceDataSelector />', () => {
  test('selecting a data view calls onSelectSavedObjectId', () => {
    const onSelectSavedObjectId = jest.fn();

    const { getByTestId } = render(
      <SourceDataSelector
        searchItems={
          {
            dataView: { getIndexPattern: () => 'logs-*', id: 'dv-0' },
          } as any
        }
        onSelectSavedObjectId={onSelectSavedObjectId}
      />
    );

    fireEvent.click(getByTestId('transformSourceDataSelectorButton'));
    fireEvent.click(getByTestId('mockChooseDataView'));
    expect(onSelectSavedObjectId).toHaveBeenCalledWith('dv-1');
  });

  test('selecting a Discover session calls onSelectSavedObjectId', () => {
    const onSelectSavedObjectId = jest.fn();

    const { getByTestId } = render(
      <SourceDataSelector
        searchItems={
          {
            dataView: { getIndexPattern: () => 'logs-*', id: 'dv-0' },
            savedSearch: { id: 'ss-0', title: 'my session' },
          } as any
        }
        onSelectSavedObjectId={onSelectSavedObjectId}
      />
    );

    fireEvent.click(getByTestId('transformSourceDataSelectorButton'));
    fireEvent.click(getByTestId('mockChooseDiscoverSession'));
    expect(onSelectSavedObjectId).toHaveBeenCalledWith('ss-1');
  });
});

