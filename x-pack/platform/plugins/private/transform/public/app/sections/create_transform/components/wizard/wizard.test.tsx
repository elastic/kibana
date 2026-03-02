/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { timefilterServiceMock } from '@kbn/data-plugin/public/query/timefilter/timefilter_service.mock';
import { MemoryRouter } from 'react-router-dom';

import { Wizard } from './wizard';

const mockUseAppDependencies = jest.fn();

jest.mock('../../../../app_dependencies', () => ({
  useAppDependencies: () => mockUseAppDependencies(),
  useToastNotifications: () => ({
    addError: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
    addDanger: jest.fn(),
  }),
}));

jest.mock('../../../../serverless_context', () => ({
  useEnabledFeatures: () => ({ showNodeInfo: false }),
}));

jest.mock('@kbn/saved-objects-finder-plugin/public', () => {
  const ReactLib = jest.requireActual('react');
  return {
    // @ts-expect-error mock props are untyped in this jest factory
    SavedObjectFinder: (props) =>
      ReactLib.createElement(
        'div',
        { 'data-test-subj': 'savedObjectFinderMock' },
        ReactLib.createElement(
          'button',
          { type: 'button', onClick: () => props.onChoose('testSavedObjectId') },
          'Choose source'
        ),
        props.children
      ),
  };
});
describe('Transform: <Wizard />', () => {
  beforeEach(() => {
    mockUseAppDependencies.mockReturnValue({
      contentManagement: { client: {} },
      uiSettings: {},
      dataViewEditor: { userPermissions: { editDataView: () => false } },
      data: {
        query: { timefilter: timefilterServiceMock.createStartContract() },
        dataViews: { get: jest.fn() },
        search: {
          aggs: {
            createAggConfigs: jest.fn(() => []),
          },
        },
      },
      savedSearch: { get: jest.fn() },
      http: {},
      notifications: {},
      theme: {},
      userProfile: {},
      i18n: {},
    });
  });

  test('advances from source selection without a Next button', async () => {
    const onSavedObjectSelected = jest.fn();

    const { getByText, getByRole, queryByRole } = render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(Wizard, { onSavedObjectSelected })
      )
    );

    expect(getByText('Configuration')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Select data source' })).toBeInTheDocument();
    expect(queryByRole('button', { name: 'Choose source' })).not.toBeInTheDocument();
    expect(queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();

    fireEvent.click(getByRole('button', { name: 'Select data source' }));
    fireEvent.click(getByRole('button', { name: 'Choose source' }));

    expect(onSavedObjectSelected).toHaveBeenCalledWith('testSavedObjectId');
  });
});
