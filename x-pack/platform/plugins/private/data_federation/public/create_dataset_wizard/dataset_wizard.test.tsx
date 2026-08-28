/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, waitFor, act, within } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';

import type { DataSource } from '../../common';
import {
  ADDITIONAL_SETTINGS_STEP,
  PREVIEW_RESULTS_STEP,
  REVIEW_STEP,
  SCHEMA_MAPPINGS_STEP,
} from './dataset_wizard_constants';
import { DatasetWizard } from './dataset_wizard';
import {
  DATASET_WIZARD_FLOW_VARIANT_1,
  DATASET_WIZARD_FLOW_VARIANT_2,
  DATASET_WIZARD_FLOW_VARIANT_3,
  DATASET_WIZARD_FLOW_VARIANT_3_9_6,
} from './dataset_wizard_flow_variant';
import { emptyDatasetWizardFormValues } from './dataset_wizard_form_state';
import { emptyCreateDatasetSettingsFormValues } from '../create_dataset_flyout/create_dataset_flyout_form_state';
import { applySettingsForFormat } from '../create_dataset_flyout/dataset_settings_defaults';
import { buildDefaultSettingsCustomJson } from '../create_dataset_flyout/settings_custom_json_schema';

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({
    value,
    onChange,
    'data-test-subj': dataTestSubj,
  }: {
    value: string;
    onChange: (value: string) => void;
    'data-test-subj'?: string;
  }) => (
    <textarea
      data-test-subj={dataTestSubj}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

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

  const renderWizard = (
    initialEntry = '/create',
    defaultValues = emptyDatasetWizardFormValues(),
    flowVariant = DATASET_WIZARD_FLOW_VARIANT_1
  ) => {
    const history = createMemoryHistory({ initialEntries: [initialEntry] });

    const view = render(
      <Router history={history}>
        <EuiProvider>
          <DatasetWizard
            isEditMode={false}
            existingDataSetNames={[]}
            dataSources={dataSources}
            defaultValues={defaultValues}
            flowVariant={flowVariant}
            reloadDataSources={jest.fn().mockResolvedValue(undefined)}
            onCancel={jest.fn()}
            onSave={jest.fn().mockResolvedValue(null)}
          />
        </EuiProvider>
      </Router>
    );

    return { ...view, history };
  };

  const selectWizardRegion = async (
    getByRole: ReturnType<typeof render>['getByRole'],
    getByTestId: ReturnType<typeof render>['getByTestId'],
    regionSearchTerm: string
  ) => {
    fireEvent.click(getByTestId('datasetWizardRegion'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardRegionSearch')).toBeInTheDocument();
    });

    fireEvent.change(getByTestId('datasetWizardRegionSearch'), {
      target: { value: regionSearchTerm },
    });

    await waitFor(() => {
      expect(getByRole('option', { name: new RegExp(regionSearchTerm, 'i') })).toBeInTheDocument();
    });

    fireEvent.click(getByRole('option', { name: new RegExp(regionSearchTerm, 'i') }));
  };

  const fillLogisticsStep = async (
    getByRole: ReturnType<typeof render>['getByRole'],
    getByTestId: ReturnType<typeof render>['getByTestId']
  ) => {
    fireEvent.click(getByTestId('datasetWizardDataSource'));
    fireEvent.click(getByRole('option', { name: /source-1/ }));
    fireEvent.change(getByTestId('datasetWizardName'), {
      target: { value: 'my-dataset' },
    });
    fireEvent.change(getByTestId('datasetWizardResource'), {
      target: { value: 's3://bucket/data.csv' },
    });
    await selectWizardRegion(getByRole, getByTestId, 'Oregon');
  };

  it('shows additional settings step after completing logistics', async () => {
    const { getByRole, getByTestId, history } = renderWizard();

    expect(getByTestId('datasetWizardSettingsFormat')).not.toBeVisible();

    await fillLogisticsStep(getByRole, getByTestId);

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

  it('keeps the Cancel button in the footer for flow 1 and flow 2', () => {
    const { getByTestId } = renderWizard();

    expect(getByTestId('datasetWizardCancel')).toBeInTheDocument();
  });

  it('omits the Cancel button from the footer in flow 3', () => {
    const { queryByTestId } = renderWizard(
      '/create?flow=flow_3',
      emptyDatasetWizardFormValues(),
      DATASET_WIZARD_FLOW_VARIANT_3
    );

    expect(queryByTestId('datasetWizardCancel')).toBeNull();
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

  it('prefills region from the resource URI when the resource field blurs', async () => {
    const { getByTestId } = renderWizard();

    fireEvent.change(getByTestId('datasetWizardResource'), {
      target: { value: 's3://logs/us-east-1/**/*.parquet' },
    });
    fireEvent.blur(getByTestId('datasetWizardResource'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardRegion')).toHaveTextContent('US East (N. Virginia)');
      expect(getByTestId('datasetWizardRegion')).toHaveTextContent('(auto-detected)');
    });
  });

  it('does not clear an existing region when the resource URI has no region', async () => {
    const draft = {
      ...emptyDatasetWizardFormValues(),
      region: 'us-west-2',
    };
    const { getByTestId } = renderWizard('/create', draft);

    expect(getByTestId('datasetWizardRegion')).toHaveTextContent('US West (Oregon)');

    fireEvent.change(getByTestId('datasetWizardResource'), {
      target: { value: 's3://logs/access/**/*.parquet' },
    });
    fireEvent.blur(getByTestId('datasetWizardResource'));

    expect(getByTestId('datasetWizardRegion')).toHaveTextContent('US West (Oregon)');
  });

  const testConfigurationDraft = {
    ...emptyDatasetWizardFormValues(),
    data_source: 'source-1',
    name: 'my-dataset',
    resource: 's3://bucket/data.parquet',
    region: 'us-west-2',
    settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'parquet'),
  };

  it('does not show the data preview table on the schema mappings step in flow 1', () => {
    const { getByTestId, queryByTestId } = renderWizard(
      `/create?step=${SCHEMA_MAPPINGS_STEP}`,
      testConfigurationDraft
    );

    expect(getByTestId('datasetWizardSchemaMappingsStep')).toBeInTheDocument();
    expect(queryByTestId('datasetWizardTestConfigurationTable')).toBeNull();
  });

  it('runs the mocked test configuration preview on the schema mappings step in flow 1', async () => {
    jest.useFakeTimers();

    const { getByTestId, queryByTestId } = renderWizard(
      `/create?step=${SCHEMA_MAPPINGS_STEP}`,
      testConfigurationDraft
    );

    expect(getByTestId('datasetWizardTestConfiguration')).toBeInTheDocument();
    expect(queryByTestId('datasetWizardTestConfigurationPreview')).toBeNull();

    fireEvent.click(getByTestId('datasetWizardTestConfiguration'));
    expect(getByTestId('datasetWizardTestConfigurationPreview')).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('runs the mocked test configuration preview on the review step in flow 1', async () => {
    jest.useFakeTimers();

    const { getByTestId, queryByTestId } = renderWizard(
      `/create?step=${REVIEW_STEP}`,
      testConfigurationDraft
    );

    expect(queryByTestId('datasetWizardTestConfigurationPreview')).toBeNull();

    fireEvent.click(getByTestId('datasetWizardTestConfiguration'));
    expect(getByTestId('datasetWizardTestConfigurationPreview')).toBeInTheDocument();
    expect(getByTestId('datasetWizardTestConfigurationLoading')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    await waitFor(() => {
      expect(queryByTestId('datasetWizardTestConfigurationLoading')).toBeNull();
      expect(getByTestId('datasetWizardTestConfigurationTable')).toBeInTheDocument();
    });

    fireEvent.click(getByTestId('datasetWizardTestConfigurationClose'));
    expect(queryByTestId('datasetWizardTestConfigurationPreview')).toBeNull();

    jest.useRealTimers();
  });

  it('shows the data preview in the review step preview results tab in flow 2', () => {
    const { getByTestId, getByText, queryByTestId } = renderWizard(
      `/create?step=${REVIEW_STEP}`,
      testConfigurationDraft,
      DATASET_WIZARD_FLOW_VARIANT_2
    );

    expect(queryByTestId('datasetWizardTestConfiguration')).toBeNull();
    expect(queryByTestId('datasetWizardTestConfigurationTable')).toBeNull();

    fireEvent.click(getByText('Preview results'));

    expect(getByTestId('datasetWizardTestConfigurationTable')).toBeInTheDocument();
  });

  it('shows preview results as its own optional step in flow 3', async () => {
    jest.useFakeTimers();

    const { getByTestId, queryByTestId, history } = renderWizard(
      `/create?flow=flow_3&step=${PREVIEW_RESULTS_STEP}`,
      testConfigurationDraft,
      DATASET_WIZARD_FLOW_VARIANT_3
    );

    expect(getByTestId('datasetWizardPreviewResultsStep')).toBeVisible();
    expect(queryByTestId('datasetWizardTestConfigurationTable')).toBeNull();
    expect(history.location.search).toContain('step=4');

    fireEvent.click(getByTestId('datasetWizardPreviewResultsButton'));
    expect(getByTestId('datasetWizardTestConfigurationLoading')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    await waitFor(() => {
      expect(getByTestId('datasetWizardTestConfigurationTable')).toBeInTheDocument();
    });

    fireEvent.click(getByTestId('datasetWizardNext'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardReviewStep')).toBeVisible();
    });

    expect(queryByTestId('datasetWizardReviewPreviewResultsTabButton')).toBeNull();
    expect(history.location.search).toContain('step=5');

    jest.useRealTimers();
  });

  it('allows skipping preview results in flow 3 without fetching rows', async () => {
    const { getByTestId, queryByTestId, history } = renderWizard(
      `/create?flow=flow_3&step=${PREVIEW_RESULTS_STEP}`,
      testConfigurationDraft,
      DATASET_WIZARD_FLOW_VARIANT_3
    );

    expect(getByTestId('datasetWizardPreviewResultsButton')).toBeInTheDocument();
    expect(queryByTestId('datasetWizardTestConfigurationTable')).toBeNull();

    fireEvent.click(getByTestId('datasetWizardNext'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardReviewStep')).toBeVisible();
    });

    expect(queryByTestId('datasetWizardTestConfigurationTable')).toBeNull();
    expect(history.location.search).toContain('step=5');
  });

  it('does not include a preview results step in flow 3 9.6', async () => {
    const { getByTestId, queryByTestId, queryByText, history } = renderWizard(
      `/create?flow=flow_3_9_6&step=${SCHEMA_MAPPINGS_STEP}`,
      testConfigurationDraft,
      DATASET_WIZARD_FLOW_VARIANT_3_9_6
    );

    expect(queryByText('Preview results')).toBeNull();
    expect(queryByTestId('datasetWizardPreviewResultsStep')).toBeNull();

    fireEvent.click(getByTestId('datasetWizardNext'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardReviewStep')).toBeVisible();
    });

    expect(queryByTestId('datasetWizardPreviewResultsStep')).toBeNull();
    expect(history.location.search).toContain('step=4');
    expect(history.location.search).not.toContain('step=5');
  });

  it('places region on additional settings in flow 3 and allows leaving logistics without it', async () => {
    const { getByRole, getByTestId } = renderWizard(
      '/create',
      emptyDatasetWizardFormValues(),
      DATASET_WIZARD_FLOW_VARIANT_3
    );

    const additionalSettings = getByTestId('datasetWizardAdditionalSettingsStep');
    expect(within(additionalSettings).getByTestId('datasetWizardRegion')).toBeInTheDocument();
    expect(additionalSettings).not.toBeVisible();

    fireEvent.click(getByTestId('datasetWizardDataSource'));
    fireEvent.click(getByRole('option', { name: /source-1/ }));
    fireEvent.change(getByTestId('datasetWizardName'), {
      target: { value: 'my-dataset' },
    });
    fireEvent.change(getByTestId('datasetWizardResource'), {
      target: { value: 's3://logs/us-east-1/**/*.parquet' },
    });
    fireEvent.blur(getByTestId('datasetWizardResource'));
    fireEvent.click(getByTestId('datasetWizardNext'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardAdditionalSettingsStep')).toBeVisible();
    });

    const region = within(getByTestId('datasetWizardAdditionalSettingsStep')).getByTestId(
      'datasetWizardRegion'
    );
    const format = within(getByTestId('datasetWizardAdditionalSettingsStep')).getByTestId(
      'datasetWizardSettingsFormat'
    );

    expect(region).toBeVisible();
    expect(region).toHaveTextContent('US East (N. Virginia)');
    expect(region).toHaveTextContent('(auto-detected)');
    expect(region.compareDocumentPosition(format) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('marks flow 3 region as auto-detected when advancing from logistics without blurring resource', async () => {
    const { getByRole, getByTestId } = renderWizard(
      '/create',
      emptyDatasetWizardFormValues(),
      DATASET_WIZARD_FLOW_VARIANT_3
    );

    fireEvent.click(getByTestId('datasetWizardDataSource'));
    fireEvent.click(getByRole('option', { name: /source-1/ }));
    fireEvent.change(getByTestId('datasetWizardName'), {
      target: { value: 'my-dataset' },
    });
    fireEvent.change(getByTestId('datasetWizardResource'), {
      target: { value: 's3://logs/us-east-1/**/*.parquet' },
    });
    fireEvent.click(getByTestId('datasetWizardNext'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardAdditionalSettingsStep')).toBeVisible();
    });

    const region = within(getByTestId('datasetWizardAdditionalSettingsStep')).getByTestId(
      'datasetWizardRegion'
    );

    expect(region).toHaveTextContent('US East (N. Virginia)');
    expect(region).toHaveTextContent('(auto-detected)');
  });

  it('validates region on additional settings in flow 3, not on logistics', async () => {
    const { getByRole, getByTestId } = renderWizard(
      '/create',
      emptyDatasetWizardFormValues(),
      DATASET_WIZARD_FLOW_VARIANT_3
    );

    fireEvent.click(getByTestId('datasetWizardDataSource'));
    fireEvent.click(getByRole('option', { name: /source-1/ }));
    fireEvent.change(getByTestId('datasetWizardName'), {
      target: { value: 'my-dataset' },
    });
    fireEvent.change(getByTestId('datasetWizardResource'), {
      target: { value: 's3://bucket/data.csv' },
    });
    fireEvent.click(getByTestId('datasetWizardNext'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardAdditionalSettingsStep')).toBeVisible();
    });

    const region = within(getByTestId('datasetWizardAdditionalSettingsStep')).getByTestId(
      'datasetWizardRegion'
    );
    expect(region).not.toHaveClass('euiSuperSelectControl-isInvalid');
    expect(getByTestId('datasetWizardAdditionalSettingsStep')).not.toHaveTextContent(
      'Region is required.'
    );

    fireEvent.click(getByTestId('datasetWizardNext'));

    await waitFor(() => {
      expect(region).toHaveClass('euiSuperSelectControl-isInvalid');
    });

    expect(getByTestId('datasetWizardAdditionalSettingsStep')).toBeVisible();
    expect(getByTestId('datasetWizardAdditionalSettingsStep')).toHaveTextContent(
      'Region is required.'
    );
  });

  it('blocks advancing from logistics when region is not selected', async () => {
    const { getByRole, getByTestId, history } = renderWizard();

    fireEvent.click(getByTestId('datasetWizardDataSource'));
    fireEvent.click(getByRole('option', { name: /source-1/ }));
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
    fireEvent.click(getByRole('option', { name: /source-1/ }));
    fireEvent.change(getByTestId('datasetWizardName'), {
      target: { value: 'my-dataset' },
    });
    fireEvent.change(getByTestId('datasetWizardResource'), {
      target: { value: 'sfr' },
    });
    await selectWizardRegion(getByRole, getByTestId, 'Oregon');

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

  it('shows JSON partition detection changes in the flow 3 review summary', async () => {
    const draft = {
      ...emptyDatasetWizardFormValues(),
      data_source: 'source-1',
      name: 'my-dataset',
      resource: 's3://bucket/data.parquet',
      region: 'us-west-2',
      settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'parquet'),
      settings_custom_json: buildDefaultSettingsCustomJson('parquet', 'fail_fast'),
    };

    const { getByRole, getByTestId } = renderWizard(
      `/create?step=${ADDITIONAL_SETTINGS_STEP}`,
      draft,
      DATASET_WIZARD_FLOW_VARIANT_3
    );

    await waitFor(() => {
      expect(getByTestId('datasetWizardAdditionalSettingsStep')).toBeVisible();
      expect(getByTestId('datasetWizardSettingsPartitionDetection')).toBeInTheDocument();
    });

    fireEvent.click(getByTestId('datasetWizardSettingsPartitionDetection'));
    fireEvent.click(getByRole('option', { name: /Hive/ }));

    fireEvent.click(getByTestId('datasetWizardNext'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardSchemaMappingsStep')).toBeVisible();
    });

    fireEvent.click(getByTestId('datasetWizardNext'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardPreviewResultsStep')).toBeVisible();
    });

    fireEvent.click(getByTestId('datasetWizardNext'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardReviewStep')).toBeVisible();
    });

    expect(getByTestId('datasetWizardReviewSettings')).toHaveTextContent('Hive');
    expect(getByTestId('datasetWizardReviewSettings')).not.toHaveTextContent('Auto');
  });
});
