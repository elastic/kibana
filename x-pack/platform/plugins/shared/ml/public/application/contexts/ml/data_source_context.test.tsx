/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { DataSourceContextProvider } from './data_source_context';
import { useMlKibana } from '../kibana';

jest.mock('../kibana', () => ({
  useMlKibana: jest.fn(),
}));

jest.mock('../../util/index_utils', () => ({
  getDataViewAndSavedSearchCallback: jest.fn(() => async (id: string) => ({
    dataView: { id, title: 'mock-saved-search-data-view' },
    savedSearch: { id: 'mock-saved-search' },
  })),
}));

jest.mock('../../jobs/new_job/utils/new_job_utils', () => ({
  createSearchItems: jest.fn(() => ({ combinedQuery: { match_all: {} } })),
}));

const mockLocationSearch = jest.fn(() => '');
jest.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/', search: mockLocationSearch() }),
}));

const mockGet = jest.fn();
const mockGetDefaultDataView = jest.fn();
const mockGetDataViewAndSavedSearch = jest.fn();

const buildKibanaMock = () => ({
  services: {
    data: {
      dataViews: {
        get: mockGet,
        getDefaultDataView: mockGetDefaultDataView,
      },
    },
    savedSearch: mockGetDataViewAndSavedSearch,
    uiSettings: {},
  },
});

const renderProvider = (children = <div data-test-subj="child-content">Hello</div>) =>
  render(
    <IntlProvider locale="en">
      <DataSourceContextProvider>{children}</DataSourceContextProvider>
    </IntlProvider>
  );

describe('DataSourceContextProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMlKibana as jest.Mock).mockReturnValue(buildKibanaMock());
  });

  it('uses default data view when no URL params are present', async () => {
    mockLocationSearch.mockReturnValue('');
    mockGetDefaultDataView.mockResolvedValue({
      id: 'default-dv',
      title: 'Default Data View',
    });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    expect(mockGetDefaultDataView).toHaveBeenCalled();
  });

  it('uses managed default data view directly without falling back to list', async () => {
    mockLocationSearch.mockReturnValue('');
    mockGetDefaultDataView.mockResolvedValue({
      id: 'logs-star',
      title: 'logs-*',
      managed: true,
    });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    expect(mockGetDefaultDataView).toHaveBeenCalled();
  });

  it('renders children with null data view when getDefaultDataView throws', async () => {
    mockLocationSearch.mockReturnValue('');
    mockGetDefaultDataView.mockRejectedValue(new Error('No default data view'));

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    expect(mockGetDefaultDataView).toHaveBeenCalled();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('renders children with null data view when no default and no data views exist', async () => {
    mockLocationSearch.mockReturnValue('');
    mockGetDefaultDataView.mockResolvedValue(null);

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    expect(mockGet).not.toHaveBeenCalled();
  });

  it('renders children when index URL param is present', async () => {
    mockLocationSearch.mockReturnValue('?index=my-index-id');
    mockGet.mockResolvedValue({
      id: 'my-index-id',
      title: 'My Index',
    });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    expect(mockGet).toHaveBeenCalledWith('my-index-id');
  });

  it('renders children when savedSearchId URL param is present', async () => {
    const { getDataViewAndSavedSearchCallback } = jest.requireMock('../../util/index_utils');
    getDataViewAndSavedSearchCallback.mockReturnValue(async (id: string) => ({
      dataView: { id: 'dv-from-saved-search', title: 'From Saved Search' },
      savedSearch: { id },
    }));

    mockLocationSearch.mockReturnValue('?savedSearchId=my-saved-search');

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });
  });

  it('shows error state when resolveDataSource throws', async () => {
    mockLocationSearch.mockReturnValue('?index=bad-index');
    mockGet.mockRejectedValue(new Error('Data view not found'));

    renderProvider();

    await waitFor(() => {
      expect(
        screen.getByText('Unable to fetch data view or saved Discover session')
      ).toBeInTheDocument();
    });

    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
  });

  it('renders null initially before the async resolve completes', async () => {
    mockLocationSearch.mockReturnValue('');
    let resolvePromise: (value: any) => void;
    mockGetDefaultDataView.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    const { container } = renderProvider();

    expect(container.firstChild).toBeNull();

    await waitFor(() => {
      resolvePromise!({ id: 'default-dv', title: 'Default' });
    });

    await waitFor(() => {
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });
  });

  it('shows error when dataViewId is an empty string', async () => {
    mockLocationSearch.mockReturnValue('?index=');

    renderProvider();

    await waitFor(() => {
      expect(
        screen.getByText('Unable to fetch data view or saved Discover session')
      ).toBeInTheDocument();
    });
  });
});
