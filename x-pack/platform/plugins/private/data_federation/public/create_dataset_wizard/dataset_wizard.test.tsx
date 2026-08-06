/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, waitFor, act } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';

import type { DataSource } from '../../common';
import { ADDITIONAL_SETTINGS_STEP, REVIEW_STEP, SCHEMA_MAPPINGS_STEP } from './dataset_wizard_constants';
import { DatasetWizard } from './dataset_wizard';
import { DATASET_WIZARD_FLOW_VARIANT_1 } from './dataset_wizard_flow_variant';
import { emptyDatasetWizardFormValues } from './dataset_wizard_form_state';
import { applySettingsForFormat } from '../create_dataset_flyout/dataset_settings_defaults';
import { emptyCreateDatasetSettingsFormValues } from '../create_dataset_flyout/create_dataset_flyout_form_state';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      dataSourcesClient: {
        add: jest.fn(),
      },
      indexManagement: {
        getMappedFieldsEditorComponent: () => () => null,
      },
      scopedHistory: {
        createSubHistory: jest.fn(),
      },
    },
  }),
}));

describe('DatasetWizard step navigation', () => {
  const dataSources: DataSource[] = [
    { name: 'source-1', type: 's3', description: '', settings: {} },
  ];

  beforeEach(() => {
    sessionStorage.clear();
  });

  const renderWizard = (initialEntry = '/create', defaultValues = emptyDatasetWizardFormValues()) => {
    const history = createMemoryHistory({ initialEntries: [initialEntry] });

    const view = render(
      <Router history={history}>
        <EuiProvider>
          <DatasetWizard
            isEditMode={false}
            existingDataSetNames={[]}
            dataSources={dataSources}
            defaultValues={defaultValues}
            flowVariant={DATASET_WIZARD_FLOW_VARIANT_1}
            reloadDataSources={jest.fn().mockResolvedValue(undefined)}
            onCancel={jest.fn()}
            onSave={jest.fn().mockResolvedValue(null)}
          />
        </EuiProvider>
      </Router>
    );

    return { ...view, history };
  };

  const selectWizardRegion = (
    getByRole: ReturnType<typeof render>['getByRole'],
    getByTestId: ReturnType<typeof render>['getByTestId'],
    regionLabel: string
  ) => {
    fireEvent.click(getByTestId('datasetWizardRegion'));
    fireEvent.click(getByRole('option', { name: new RegExp(regionLabel) }));
  };

  const fillLogisticsStep = (getByRole: ReturnType<typeof render>['getByRole'], getByTestId: ReturnType<typeof render>['getByTestId']) => {
    fireEvent.click(getByTestId('datasetWizardDataSource'));
    fireEvent.click(getByRole('option', { name: 'source-1' }));
    fireEvent.change(getByTestId('datasetWizardName'), {
      target: { value: 'my-dataset' },
    });
    fireEvent.change(getByTestId('datasetWizardResource'), {
      target: { value: 's3://bucket/data.csv' },
    });
    selectWizardRegion(getByRole, getByTestId, 'US West \\(Oregon\\)');
  };

  it('shows additional settings step after completing logistics', async () => {
    const { getByRole, getByTestId, history } = renderWizard();

    expect(getByTestId('datasetWizardSettingsFormat')).not.toBeVisible();

    fillLogisticsStep(getByRole, getByTestId);

    expect(getByTestId('datasetWizardNext')).toBeInTheDocument();
    fireEvent.click(getByTestId('datasetWizardNext'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardAdditionalSettingsStep')).toBeInTheDocument();
      expect(getByTestId('datasetWizardSettingsFormat')).toBeInTheDocument();
      expect(history.location.search).toBe(`?step=${ADDITIONAL_SETTINGS_STEP}`);
    });
  });

  it('does not show additional settings content on the logistics step', () => {
    const { getByTestId } = renderWizard();

    expect(getByTestId('datasetWizardSettingsFormat')).not.toBeVisible();
  });

  it('restores the wizard step from the URL on load when logistics are valid', async () => {
    const draft = {
      ...emptyDatasetWizardFormValues(),
      data_source: 'source-1',
      name: 'my-dataset',
      resource: 's3://bucket/data.csv',
      region: 'us-west-2',
      settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv'),
    };

    const { getByTestId, container } = renderWizard(
      `/create?step=${ADDITIONAL_SETTINGS_STEP}`,
      draft
    );

    await waitFor(() => {
      expect(getByTestId('datasetWizardAdditionalSettingsStep')).toBeVisible();
    });

    const currentStepIndicator = container.querySelector('[data-step-status="current"]');
    expect(currentStepIndicator).toHaveTextContent('Additional settings');
  });

  it('restores persisted form values on load', () => {
    const draft = {
      ...emptyDatasetWizardFormValues(),
      data_source: 'source-1',
      name: 'my-dataset',
      resource: 's3://bucket/data.csv',
    };

    const { getByTestId } = renderWizard('/create', draft);

    expect(getByTestId('datasetWizardName')).toHaveValue('my-dataset');
    expect(getByTestId('datasetWizardResource')).toHaveValue('s3://bucket/data.csv');
  });

  const testConfigurationDraft = {
    ...emptyDatasetWizardFormValues(),
    data_source: 'source-1',
    name: 'my-dataset',
    resource: 's3://bucket/data.parquet',
    region: 'us-west-2',
    settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'parquet'),
  };

  it('does not show the data preview table on the schema mappings step', () => {
    const { getByTestId, queryByTestId } = renderWizard(
      `/create?step=${SCHEMA_MAPPINGS_STEP}`,
      testConfigurationDraft
    );

    expect(getByTestId('datasetWizardSchemaMappingsStep')).toBeInTheDocument();
    expect(queryByTestId('datasetWizardTestConfigurationTable')).toBeNull();
  });

  it('shows the data preview in the review step preview results tab', () => {
    const { getByTestId, getByText, queryByTestId } = renderWizard(
      `/create?step=${REVIEW_STEP}`,
      testConfigurationDraft
    );

    expect(queryByTestId('datasetWizardTestConfigurationTable')).toBeNull();

    fireEvent.click(getByText('Preview results'));

    expect(getByTestId('datasetWizardTestConfigurationTable')).toBeInTheDocument();
  });

  it('blocks advancing from logistics when region is not selected', async () => {
    const { getByRole, getByTestId, history } = renderWizard();

    fireEvent.click(getByTestId('datasetWizardDataSource'));
    fireEvent.click(getByRole('option', { name: 'source-1' }));
    fireEvent.change(getByTestId('datasetWizardName'), {
      target: { value: 'my-dataset' },
    });
    fireEvent.change(getByTestId('datasetWizardResource'), {
      target: { value: 's3://bucket/data.csv' },
    });

    fireEvent.click(getByTestId('datasetWizardNext'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardRegion')).toHaveClass('euiSuperSelectControl-isInvalid');
    });

    expect(getByTestId('datasetWizardAdditionalSettingsStep')).not.toBeVisible();
    expect(history.location.search).toBe('');
  });

  it('blocks advancing from logistics when the resource URI is invalid', async () => {
    const { getByRole, getByTestId, history } = renderWizard();

    fireEvent.click(getByTestId('datasetWizardDataSource'));
    fireEvent.click(getByRole('option', { name: 'source-1' }));
    fireEvent.change(getByTestId('datasetWizardName'), {
      target: { value: 'my-dataset' },
    });
    fireEvent.change(getByTestId('datasetWizardResource'), {
      target: { value: 'sfr' },
    });
    selectWizardRegion(getByRole, getByTestId, 'US West \\(Oregon\\)');

    fireEvent.click(getByTestId('datasetWizardNext'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardResource')).toBeInvalid();
    });

    expect(getByTestId('datasetWizardAdditionalSettingsStep')).not.toBeVisible();
    expect(history.location.search).toBe('');
  });

  it('redirects invalid deep links back to logistics', async () => {
    const { getByTestId, history } = renderWizard(`/create?step=${REVIEW_STEP}`);

    await waitFor(() => {
      expect(getByTestId('datasetWizardName')).toBeVisible();
      expect(getByTestId('datasetWizardAdditionalSettingsStep')).not.toBeVisible();
    });

    expect(history.location.search).toBe('');
  });
});
