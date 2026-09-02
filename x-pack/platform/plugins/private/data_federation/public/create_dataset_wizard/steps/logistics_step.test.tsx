/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, PropsWithChildren } from 'react';
import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';

import type { DataSource } from '../../../common';
import { DATASET_SETTING_DESCRIPTION_TEST_SUBJ } from '../../create_dataset_flyout/dataset_settings_default_hints';
import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';
import { emptyDatasetWizardFormValues } from '../dataset_wizard_form_state';
import {
  DATASET_WIZARD_FLOW_VARIANT_3,
  DATASET_WIZARD_FLOW_VARIANT_3_9_6,
  type DatasetWizardFlowVariant,
} from '../dataset_wizard_flow_variant';
import { LogisticsStep } from './logistics_step';

const dataSources: DataSource[] = [
  { name: 'obs-prod-s3', type: 's3', description: '', settings: {} } as unknown as DataSource,
];

const TestProviders: FunctionComponent<PropsWithChildren> = ({ children }) => (
  <EuiProvider>
    <I18nProvider>{children}</I18nProvider>
  </EuiProvider>
);

const TestHarness = ({
  flowVariant,
  format = '',
}: {
  flowVariant: DatasetWizardFlowVariant;
  format?: string;
}) => {
  const { control, setValue } = useForm<DatasetWizardFormValues>({
    defaultValues: {
      ...emptyDatasetWizardFormValues(),
      settings: { ...emptyDatasetWizardFormValues().settings, format },
    } as DatasetWizardFormValues,
  });

  return (
    <TestProviders>
      <LogisticsStep
        control={control}
        dataSources={dataSources}
        onConnectNewDataSource={jest.fn()}
        validateName={() => true}
        setValue={setValue}
        flowVariant={flowVariant}
        syncRegionFromResource={jest.fn()}
      />
    </TestProviders>
  );
};

describe('LogisticsStep', () => {
  it('asks for the partition settings beside the resource in flow 3 9.6', () => {
    render(<TestHarness flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6} />);

    expect(screen.getByTestId('datasetWizardSettingsPartitionDetection')).toBeInTheDocument();
    expect(screen.getByTestId('datasetWizardSettingsPartitionPath')).toBeInTheDocument();
  });

  it('marks the partition settings as optional', () => {
    render(<TestHarness flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6} />);

    expect(screen.getByText('Partition detection (optional)')).toBeInTheDocument();
    expect(screen.getByText('Partition path (optional)')).toBeInTheDocument();
  });

  it('sizes the partition settings like the fields around them', () => {
    render(<TestHarness flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6} />);

    ['datasetWizardSettingsPartitionDetection', 'datasetWizardSettingsPartitionPath'].forEach(
      (testSubj) => {
        const row = screen.getByTestId(testSubj).closest('.euiFormRow');

        /** The dense settings panels compress their controls; a step's own fields do not. */
        expect(row?.querySelector('[class*="-compressed"]')).toBeNull();
      }
    );
  });

  it('names the partition detection default once the format is known', () => {
    render(<TestHarness flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6} format="parquet" />);

    const field = screen.getByTestId('datasetWizardSettingsPartitionDetection');
    /** Where defaults are shown, the description moves to a screen reader only help text. */
    const visibleHelpText = Array.from(
      field.closest('.euiFormRow')?.querySelectorAll('.euiFormHelpText') ?? []
    ).filter(
      (helpText) =>
        !helpText.querySelector(`[data-test-subj="${DATASET_SETTING_DESCRIPTION_TEST_SUBJ}"]`)
    );

    expect(visibleHelpText).toHaveLength(1);
    expect(visibleHelpText[0]).toHaveTextContent('auto by default.');
  });

  it('leaves the partition settings with the format settings in flow 3', () => {
    render(<TestHarness flowVariant={DATASET_WIZARD_FLOW_VARIANT_3} />);

    expect(screen.queryByTestId('datasetWizardSettingsPartitionDetection')).toBeNull();
    expect(screen.queryByTestId('datasetWizardSettingsPartitionPath')).toBeNull();
  });
});
