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
const mockGetDefaultId = jest.fn();
const mockGetIdsWithTitle = jest.fn();
const mockGetDataViewAndSavedSearch = jest.fn();

const buildKibanaMock = () => ({
  services: {
    data: {
      dataViews: {
        get: mockGet,
        getDefaultId: mockGetDefaultId,
        getIdsWithTitle: mockGetIdsWithTitle,
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
    mockGetIdsWithTitle.mockResolvedValue([]);
  });

  it('uses default data view when no URL params are present', async () => {
    mockLocationSearch.mockReturnValue('');
    mockGetDefaultId.mockResolvedValue('default-dv');
    mockGet.mockResolvedValue({ id: 'default-dv', title: 'Default Data View' });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    expect(mockGetDefaultId).toHaveBeenCalled();
    expect(mockGet).toHaveBeenCalledWith('default-dv');
  });

  it('uses default data view when it has an id returned by getDefaultId', async () => {
    mockLocationSearch.mockReturnValue('');
    mockGetDefaultId.mockResolvedValue('logs-star');
    mockGet.mockResolvedValue({ id: 'logs-star', title: 'logs-*' });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    expect(mockGetDefaultId).toHaveBeenCalled();
    expect(mockGet).toHaveBeenCalledWith('logs-star');
  });

  it('renders children with null data view when getDefaultId throws', async () => {
    mockLocationSearch.mockReturnValue('');
    mockGetDefaultId.mockRejectedValue(new Error('No default data view'));

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    expect(mockGetDefaultId).toHaveBeenCalled();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('renders children with null data view when no default and no data views exist', async () => {
    mockLocationSearch.mockReturnValue('');
    mockGetDefaultId.mockResolvedValue(null);

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
    mockGetDefaultId.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );
    mockGet.mockResolvedValue({ id: 'default-dv', title: 'Default' });

    const { container } = renderProvider();

    expect(container.firstChild).toBeNull();

    await waitFor(() => {
      resolvePromise!('default-dv');
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
