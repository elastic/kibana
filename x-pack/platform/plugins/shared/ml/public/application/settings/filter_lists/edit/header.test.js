/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '../../../test_utils/render_with_ml_context';

import { EditFilterListHeader } from './header';

jest.mock('../../../contexts/kibana', () => ({
  useMlKibana: () => ({
    services: {
      application: {
        navigateToApp: jest.fn(),
        getUrlForApp: jest.fn(() => '/app/management/ml/ad_settings/filter_lists'),
      },
    },
  }),
  useNavigateToPath: () => jest.fn(),
}));

describe('EditFilterListHeader', () => {
  const updateNewFilterId = jest.fn(() => {});
  const updateDescription = jest.fn(() => {});

  const requiredProps = {
    updateNewFilterId,
    updateDescription,
    canCreateFilter: true,
    canDeleteFilter: true,
  };

  test('renders the header when creating a new filter list with the ID not set', () => {
    const props = {
      ...requiredProps,
      newFilterId: '',
      isNewFilterIdInvalid: true,
      totalItemCount: 0,
    };

    const { getByTestId, getByText } = renderWithI18n(<EditFilterListHeader {...props} />);

    expect(getByTestId('appHeaderTitle')).toHaveTextContent('Create new filter list');
    expect(getByTestId('mlNewFilterListIdInput')).toHaveValue('');
    expect(getByText('Add a description')).toBeInTheDocument();
    expect(getByText('0 items in total')).toBeInTheDocument();
  });

  test('renders the header when creating a new filter list with ID, description and items set', () => {
    const props = {
      ...requiredProps,
      newFilterId: 'test_filter_list',
      isNewFilterIdInvalid: false,
      description: 'A test filter list',
      totalItemCount: 15,
    };

    const { getByTestId, getByText } = renderWithI18n(<EditFilterListHeader {...props} />);

    expect(getByTestId('appHeaderTitle')).toHaveTextContent('Create new filter list');
    expect(getByTestId('mlNewFilterListIdInput')).toHaveValue('test_filter_list');
    expect(getByTestId('mlNewFilterListDescriptionText')).toHaveTextContent('A test filter list');
    expect(getByText('15 items in total')).toBeInTheDocument();
  });

  test('renders the header when editing an existing unused filter list with no description or items', () => {
    const props = {
      ...requiredProps,
      filterId: 'test_filter_list',
      totalItemCount: 0,
    };

    const { getByTestId, getByText, queryByTestId } = renderWithI18n(
      <EditFilterListHeader {...props} />
    );

    expect(getByTestId('appHeaderTitle')).toHaveTextContent('Filter list test_filter_list');
    expect(queryByTestId('mlNewFilterListIdInput')).not.toBeInTheDocument();
    expect(getByText('Add a description')).toBeInTheDocument();
    expect(getByText('0 items in total')).toBeInTheDocument();
    expect(getByText('This filter list is not used by any jobs.')).toBeInTheDocument();
  });

  test('renders the header when editing an existing used filter list with description and items set', () => {
    const props = {
      ...requiredProps,
      filterId: 'test_filter_list',
      description: 'A test filter list',
      totalItemCount: 15,
      usedBy: {
        jobs: ['cloudwatch'],
        detectors: ['mean CPUUtilization'],
      },
    };

    const { getByRole, getByTestId, getByText } = renderWithI18n(
      <EditFilterListHeader {...props} />
    );

    expect(getByTestId('appHeaderTitle')).toHaveTextContent('Filter list test_filter_list');
    expect(getByTestId('mlNewFilterListDescriptionText')).toHaveTextContent('A test filter list');
    expect(getByText('15 items in total')).toBeInTheDocument();
    expect(getByRole('button', { name: '1 detector' })).toBeInTheDocument();
    expect(getByRole('button', { name: '1 job' })).toBeInTheDocument();
  });
});
