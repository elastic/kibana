/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { MlDataSourcePicker } from './ml_data_source_picker';
import type { MlDataSourcePickerServices } from './ml_data_source_picker';

const mockHistoryReplace = vi.fn();
vi.mock('react-router-dom', () => {
  const mocked = {
    useHistory: vi.fn(() => ({ replace: mockHistoryReplace })),
    useLocation: vi.fn(() => ({ pathname: '/jobs/new_job/step/data_view', search: '' })),
  };
  return { ...mocked, default: mocked };
});

let capturedDataViewPickerProps: Record<string, any> = {};
const MockDataViewPicker = (props: any) => {
  capturedDataViewPickerProps = props;
  return (
    <div data-test-subj="mockDataViewPicker">
      <span>{props.trigger?.label}</span>
    </div>
  );
};

vi.mock('./ml_open_session_flyout', () => {
  const mocked = {
    MlOpenSessionFlyout: (props: any) => {
      return (
        <div data-test-subj="mockOpenSessionFlyout">
          <button onClick={props.onClose} data-test-subj="closeSessionPanel">
            Close
          </button>
          <button
            onClick={() => props.onOpenSavedSearch('saved-search-id-1')}
            data-test-subj="openSavedSearch"
          >
            Open Saved Search
          </button>
        </div>
      );
    },
  };
  return { ...mocked, default: mocked };
});

const mockGetIdsWithTitle = vi.fn().mockResolvedValue([]);
const mockOpenEditor = vi.fn().mockResolvedValue(() => {});

const buildServices = (
  overrides?: Partial<MlDataSourcePickerServices>
): MlDataSourcePickerServices =>
  ({
    dataViews: { getIdsWithTitle: mockGetIdsWithTitle },
    dataViewEditor: {
      userPermissions: { editDataView: vi.fn(() => true) },
    },
    dataViewFieldEditor: { openEditor: mockOpenEditor },
    http: { basePath: { prepend: vi.fn((p: string) => p) } },
    application: { capabilities: {} },
    contentManagement: { client: {} },
    uiSettings: {},
    ...overrides,
  } as unknown as MlDataSourcePickerServices);

const MockSavedObjectFinder = () => <div data-test-subj="mockSavedObjectFinder" />;

const renderComponent = (props: { currentDataView: any; services?: MlDataSourcePickerServices }) =>
  render(
    <IntlProvider locale="en">
      <MlDataSourcePicker
        currentDataView={props.currentDataView}
        services={props.services ?? buildServices()}
        DataViewPickerComponent={MockDataViewPicker}
        SavedObjectFinderComponent={MockSavedObjectFinder}
      />
    </IntlProvider>
  );

describe('MlDataSourcePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedDataViewPickerProps = {};
  });

  it('renders DataViewPicker with "Select data view" label when currentDataView is null', async () => {
    await act(async () => {
      renderComponent({ currentDataView: null });
    });

    expect(screen.getByTestId('mockDataViewPicker')).toBeDefined();
    expect(screen.getByText('Select data view')).toBeDefined();
    expect(capturedDataViewPickerProps.trigger?.label).toBe('Select data view');
  });

  it('renders DataViewPicker with the data view name when currentDataView is provided', async () => {
    const mockDataView = {
      id: 'dv-1',
      getName: vi.fn(() => 'My Data View'),
    };

    await act(async () => {
      renderComponent({ currentDataView: mockDataView });
    });

    expect(screen.getByText('My Data View')).toBeDefined();
    expect(capturedDataViewPickerProps.trigger?.label).toBe('My Data View');
    expect(capturedDataViewPickerProps.currentDataViewId).toBe('dv-1');
  });

  it('calls navigateToPath with ?index=<id> when onChangeDataView is triggered', async () => {
    await act(async () => {
      renderComponent({ currentDataView: null });
    });

    await act(async () => {
      capturedDataViewPickerProps.onChangeDataView('test-index-id');
    });

    expect(mockHistoryReplace).toHaveBeenCalledWith({ search: '?index=test-index-id' });
  });

  it('renders MlOpenSessionFlyout when "Open Discover session" button is clicked', async () => {
    await act(async () => {
      renderComponent({ currentDataView: null });
    });

    expect(screen.queryByTestId('mockOpenSessionFlyout')).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByTestId('mlOpenDiscoverSessionButton'));
    });

    expect(screen.getByTestId('mockOpenSessionFlyout')).toBeDefined();
  });

  it('onOpenSavedSearch calls navigateToPath with ?savedSearchId=<id> and hides the flyout', async () => {
    await act(async () => {
      renderComponent({ currentDataView: null });
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('mlOpenDiscoverSessionButton'));
    });

    expect(screen.getByTestId('mockOpenSessionFlyout')).toBeDefined();

    await act(async () => {
      fireEvent.click(screen.getByTestId('openSavedSearch'));
    });

    expect(mockHistoryReplace).toHaveBeenCalledWith({
      search: '?savedSearchId=saved-search-id-1',
    });
    expect(screen.queryByTestId('mockOpenSessionFlyout')).toBeNull();
  });

  it('onDataViewCreated navigates and refreshes data views when the new view has an id', async () => {
    const refreshedViews = [{ id: 'new-dv', title: 'New DV' }];
    mockGetIdsWithTitle.mockResolvedValueOnce([]).mockResolvedValueOnce(refreshedViews);

    await act(async () => {
      renderComponent({ currentDataView: null });
    });

    await act(async () => {
      await capturedDataViewPickerProps.onDataViewCreated({ id: 'new-dv-id' });
    });

    expect(mockHistoryReplace).toHaveBeenCalledWith({ search: '?index=new-dv-id' });
    expect(mockGetIdsWithTitle).toHaveBeenCalledTimes(2);
  });

  it('onAddField is defined and calls dataViewFieldEditor.openEditor when canEditDataView=true and currentDataView is set', async () => {
    const mockDataView = {
      id: 'dv-1',
      getName: vi.fn(() => 'My Data View'),
    };

    await act(async () => {
      renderComponent({ currentDataView: mockDataView });
    });

    expect(capturedDataViewPickerProps.onAddField).toBeDefined();

    await act(async () => {
      await capturedDataViewPickerProps.onAddField();
    });

    expect(mockOpenEditor).toHaveBeenCalledWith({
      ctx: { dataView: mockDataView },
      onSave: expect.any(Function),
    });
  });

  it('onAddField is undefined when canEditDataView=false', async () => {
    const mockDataView = {
      id: 'dv-1',
      getName: vi.fn(() => 'My Data View'),
    };

    const services = buildServices({
      dataViewEditor: {
        userPermissions: { editDataView: vi.fn(() => false) },
      },
    } as any);

    await act(async () => {
      renderComponent({ currentDataView: mockDataView, services });
    });

    expect(capturedDataViewPickerProps.onAddField).toBeUndefined();
  });
});
