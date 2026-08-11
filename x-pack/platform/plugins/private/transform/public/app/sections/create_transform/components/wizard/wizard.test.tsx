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
import { PROJECT_ROUTING } from '@kbn/cps-utils';
import type { ProjectRouting } from '@kbn/es-query';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';

import { TRANSFORM_FUNCTION } from '../../../../../../common/constants';
import type { SearchItems } from '../../../../hooks/use_search_items';
import * as appDependencies from '../../../../app_dependencies';

import { Wizard } from './wizard';

let mockDataViewPickerProps: Record<string, any> = {};
let mockEmptyStepDefineFormProps: Record<string, any> = {};
let mockProjectScopePickerProps: Record<string, any> = {};
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

jest.mock('@kbn/cps-utils', () => {
  const actual = jest.requireActual('@kbn/cps-utils');
  return {
    ...actual,
    ProjectScopePicker: (props: Record<string, any>) => {
      mockProjectScopePickerProps = props;
      return (
        <button
          type="button"
          data-test-subj="mockProjectScopePicker"
          onClick={() => props.onProjectRoutingChange('_id:linked-id')}
        >
          Project scope picker
        </button>
      );
    },
  };
});

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
    mockProjectScopePickerProps = {};
    mockStepDefineFormProps = {};
    const appDeps = appDependencies.useAppDependencies();
    appDeps.cps = undefined;
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

  test('renders project scope before a data view is selected', async () => {
    const appDeps = appDependencies.useAppDependencies();
    appDeps.cps = {
      isTierEligible: true,
      cpsManager: {
        whenReady: jest.fn().mockResolvedValue(undefined),
        fetchProjects: jest.fn().mockResolvedValue({
          origin: {
            _id: 'origin-id',
            _alias: 'local_project',
            _organisation: 'org',
            _type: 'security',
          },
          linkedProjects: [
            {
              _id: 'linked-id',
              _alias: 'linked_local_project',
              _organisation: 'org',
              _type: 'security',
            },
          ],
        }),
        getDefaultProjectRouting: jest.fn(() => PROJECT_ROUTING.ALL),
      },
    } as any;

    renderWizard({
      initialTransformFunction: TRANSFORM_FUNCTION.LATEST,
      setSavedObjectId: jest.fn(),
    });

    await waitFor(() => {
      expect(screen.getByTestId('transformProjectScopePicker')).toHaveTextContent('All projects');
    });
    expect(screen.getByTestId('transformDataViewPicker')).toHaveTextContent('Select data view');
  });

  test('does not render project scope or inject default routing when CPS tier is ineligible', async () => {
    const appDeps = appDependencies.useAppDependencies();
    const getDefaultProjectRouting = jest.fn(() => '_id:linked-id');
    appDeps.cps = {
      isTierEligible: false,
      cpsManager: {
        whenReady: jest.fn().mockResolvedValue(undefined),
        fetchProjects: jest.fn(),
        getDefaultProjectRouting,
      },
    } as any;

    renderWizard({
      initialTransformFunction: TRANSFORM_FUNCTION.LATEST,
      searchItems: createSearchItems('current-data-view-id', 'current-data-view'),
      setSavedObjectId: jest.fn(),
    });

    await waitFor(() => {
      expect(screen.getByTestId('mockStepDefineForm')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('transformProjectScopePicker')).not.toBeInTheDocument();
    expect(mockStepDefineFormProps.overrides.projectRouting).toBeUndefined();
    expect(getDefaultProjectRouting).not.toHaveBeenCalled();
  });

  test('shows a visible project scope error when project fetch fails', async () => {
    const appDeps = appDependencies.useAppDependencies();
    appDeps.cps = {
      isTierEligible: true,
      cpsManager: {
        whenReady: jest.fn().mockResolvedValue(undefined),
        fetchProjects: jest.fn().mockRejectedValue(new Error('Project fetch failed')),
        getDefaultProjectRouting: jest.fn(() => PROJECT_ROUTING.ALL),
      },
    } as any;

    renderWizard({
      initialTransformFunction: TRANSFORM_FUNCTION.LATEST,
      setSavedObjectId: jest.fn(),
    });

    await waitFor(() => {
      expect(screen.getByText('Project scope unavailable')).toBeInTheDocument();
    });
    expect(screen.getByTestId('transformProjectScopePicker')).toBeDisabled();
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

  test('updates project routing when project scope changes', async () => {
    const appDeps = appDependencies.useAppDependencies();
    appDeps.cps = {
      isTierEligible: true,
      cpsManager: {
        whenReady: jest.fn().mockResolvedValue(undefined),
        fetchProjects: jest.fn().mockResolvedValue({
          origin: {
            _id: 'origin-id',
            _alias: 'local_project',
            _organisation: 'org',
            _type: 'security',
          },
          linkedProjects: [
            {
              _id: 'linked-id',
              _alias: 'linked_local_project',
              _organisation: 'org',
              _type: 'security',
            },
          ],
        }),
        getDefaultProjectRouting: jest.fn(() => PROJECT_ROUTING.ALL),
      },
    } as any;

    renderWizard({
      initialTransformFunction: TRANSFORM_FUNCTION.LATEST,
      searchItems: createSearchItems('current-data-view-id', 'current-data-view'),
      setSavedObjectId: jest.fn(),
    });

    await waitFor(() => {
      expect(screen.getByTestId('transformProjectScopePicker')).toHaveTextContent('All projects');
    });

    fireEvent.click(screen.getByTestId('transformProjectScopePicker'));
    fireEvent.click(await screen.findByTestId('mockProjectScopePicker'));

    await waitFor(() => {
      expect(mockStepDefineFormProps.overrides.projectRouting).toBe('_id:linked-id');
      expect(mockProjectScopePickerProps.projectRouting).toBe('_id:linked-id');
    });
  });

  test('adopts the resolved default project routing from CPS manager readiness', async () => {
    const appDeps = appDependencies.useAppDependencies();
    let resolveWhenReady: () => void = () => {};
    let defaultProjectRouting: ProjectRouting = PROJECT_ROUTING.ALL;
    appDeps.cps = {
      isTierEligible: true,
      cpsManager: {
        whenReady: jest.fn(
          () =>
            new Promise<void>((resolve) => {
              resolveWhenReady = resolve;
            })
        ),
        fetchProjects: jest.fn().mockResolvedValue({
          origin: {
            _id: 'origin-id',
            _alias: 'local_project',
            _organisation: 'org',
            _type: 'security',
          },
          linkedProjects: [
            {
              _id: 'linked-id',
              _alias: 'linked_local_project',
              _organisation: 'org',
              _type: 'security',
            },
          ],
        }),
        getDefaultProjectRouting: jest.fn(() => defaultProjectRouting),
      },
    } as any;

    renderWizard({
      initialTransformFunction: TRANSFORM_FUNCTION.LATEST,
      searchItems: createSearchItems('current-data-view-id', 'current-data-view'),
      setSavedObjectId: jest.fn(),
    });

    await waitFor(() => {
      expect(screen.getByTestId('transformProjectScopePicker')).toHaveTextContent('All projects');
    });

    defaultProjectRouting = '_id:linked-id';
    resolveWhenReady();

    await waitFor(() => {
      expect(screen.getByTestId('transformProjectScopePicker')).toHaveTextContent('1/2 projects');
      expect(mockStepDefineFormProps.overrides.projectRouting).toBe('_id:linked-id');
    });
  });
});
