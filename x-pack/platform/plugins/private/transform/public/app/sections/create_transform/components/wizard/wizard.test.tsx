/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { DataView } from '@kbn/data-views-plugin/public';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';

import { TRANSFORM_FUNCTION } from '../../../../../../common/constants';
import type { SearchItems } from '../../../../hooks/use_search_items';
import * as appDependencies from '../../../../app_dependencies';

import { Wizard } from './wizard';

let mockDataViewPickerProps: Record<string, any> = {};
let mockEmptyStepDefineFormProps: Record<string, any> = {};
let mockStepDefineFormProps: Record<string, any> = {};

jest.mock('../../../../app_dependencies');

jest.mock('../../../../serverless_context', () => ({
  useEnabledFeatures: () => ({ showNodeInfo: false }),
}));

jest.mock('@kbn/unified-search-plugin/public', () => ({
  DataViewPicker: (props: Record<string, any>) => {
    mockDataViewPickerProps = props;
    return (
      <button
        type="button"
        data-test-subj={props.trigger['data-test-subj']}
        onClick={() => props.onChangeDataView('next-data-view-id')}
      >
        {props.trigger.label}
      </button>
    );
  },
}));

jest.mock('@kbn/ml-field-stats-flyout', () => ({
  FieldStatsFlyoutProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../step_define', () => {
  const actual = jest.requireActual('../step_define/common');
  return {
    ...actual,
    EmptyStepDefineForm: (props: Record<string, any>) => {
      mockEmptyStepDefineFormProps = props;
      return (
        <div data-test-subj="mockEmptyStepDefineForm">
          {props.dataViewPicker}
          <span>Source data</span>
          <span>Time range</span>
          <span>Search filter</span>
          <span>
            {props.transformFunction === 'latest'
              ? 'Unique keys Sort field'
              : 'Group by Aggregations'}
          </span>
        </div>
      );
    },
    StepDefineForm: (props: Record<string, any>) => {
      mockStepDefineFormProps = props;
      return <div data-test-subj="mockStepDefineForm" />;
    },
    StepDefineSummary: () => <div data-test-subj="mockStepDefineSummary" />,
  };
});

jest.mock('../step_details', () => {
  const actual = jest.requireActual('../step_details/common');
  return {
    ...actual,
    StepDetailsForm: () => <div data-test-subj="mockStepDetailsForm" />,
    StepDetailsSummary: () => <div data-test-subj="mockStepDetailsSummary" />,
  };
});

jest.mock('../step_create', () => ({
  getDefaultStepCreateState: () => ({ created: false, dataViewId: undefined, started: false }),
  StepCreateForm: () => <div data-test-subj="mockStepCreateForm" />,
  StepCreateSummary: () => <div data-test-subj="mockStepCreateSummary" />,
}));

const createSearchItems = (id: string, name: string): SearchItems => ({
  dataView: {
    fields: [],
    getComputedFields: () => ({ runtimeFields: {} }),
    getIndexPattern: () => name,
    getName: () => name,
    id,
  } as unknown as DataView,
  savedSearch: undefined,
  query: {},
  combinedQuery: {},
});

const renderWizard = (props: React.ComponentProps<typeof Wizard>) => {
  const history = createMemoryHistory();
  return renderWithI18n(
    <Router history={history}>
      <Wizard {...props} />
    </Router>
  );
};

describe('Transform: <Wizard />', () => {
  beforeEach(() => {
    mockDataViewPickerProps = {};
    mockEmptyStepDefineFormProps = {};
    mockStepDefineFormProps = {};
    const appDeps = appDependencies.useAppDependencies();
    appDeps.data.dataViews.getIdsWithTitle = jest.fn().mockResolvedValue([
      { id: 'current-data-view-id', title: 'current-data-view' },
      { id: 'next-data-view-id', title: 'next-data-view' },
    ]);
  });

  test('renders empty source fields before a data view is selected', async () => {
    const setSavedObjectId = jest.fn();

    renderWizard({
      initialTransformFunction: TRANSFORM_FUNCTION.LATEST,
      setSavedObjectId,
    });

    expect(screen.getByTestId('transformDataViewPicker')).toHaveTextContent('Select data view');
    expect(screen.getByTestId('mockEmptyStepDefineForm')).toBeInTheDocument();
    expect(screen.getByText('Source data')).toBeInTheDocument();
    expect(screen.getByText('Time range')).toBeInTheDocument();
    expect(screen.getByText('Search filter')).toBeInTheDocument();
    expect(screen.getByText('Unique keys Sort field')).toBeInTheDocument();
    expect(mockEmptyStepDefineFormProps.transformFunction).toBe(TRANSFORM_FUNCTION.LATEST);

    fireEvent.click(screen.getByTestId('transformDataViewPicker'));

    expect(setSavedObjectId).toHaveBeenCalledWith('next-data-view-id');
    await waitFor(() => {
      expect(mockDataViewPickerProps.savedDataViews).toHaveLength(2);
    });
  });

  test('shows confirmation before changing an existing data view', async () => {
    const setSavedObjectId = jest.fn();

    renderWizard({
      initialTransformFunction: TRANSFORM_FUNCTION.LATEST,
      searchItems: createSearchItems('current-data-view-id', 'current-data-view'),
      setSavedObjectId,
    });

    await waitFor(() => {
      expect(screen.getByTestId('mockStepDefineForm')).toBeInTheDocument();
    });
    expect(mockStepDefineFormProps.overrides.transformFunction).toBe(TRANSFORM_FUNCTION.LATEST);

    fireEvent.click(screen.getByTestId('transformDataViewPicker'));
    expect(screen.getByTestId('transformChangeDataViewConfirmModal')).toBeInTheDocument();
    expect(setSavedObjectId).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Cancel'));
    expect(setSavedObjectId).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('transformDataViewPicker'));
    fireEvent.click(screen.getByText('Change data view'));

    expect(setSavedObjectId).toHaveBeenCalledWith('next-data-view-id');
    expect(screen.queryByTestId('mockStepDefineForm')).not.toBeInTheDocument();
    expect(screen.getByTestId('mockEmptyStepDefineForm')).toBeInTheDocument();
  });
});
