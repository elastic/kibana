/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { render } from '@testing-library/react';
import { useForm } from 'react-hook-form';

import type { CreateDatasetFormValues } from './create_dataset_flyout_form_state';
import { emptyCreateDatasetSettingsFormValues } from './create_dataset_flyout_form_state';
import { DatasetSettingsFieldsLayout } from './dataset_settings_fields_layout';

jest.mock('./dataset_settings_field', () => ({
  DatasetSettingsField: ({
    fieldId,
    testSubjPrefix,
  }: {
    fieldId: string;
    testSubjPrefix: string;
  }) => <div data-test-subj={`${testSubjPrefix}SettingsField-${fieldId}`}>{fieldId}</div>,
}));

const TestHarness = ({
  fields,
  columns,
}: {
  fields: Array<'delimiter' | 'datetime_format' | 'mode' | 'quote' | 'escape'>;
  columns?: number;
}) => {
  const { control } = useForm<CreateDatasetFormValues>({
    defaultValues: {
      name: '',
      description: '',
      data_source: '',
      resource: '',
      settings: emptyCreateDatasetSettingsFormValues(),
    },
  });

  return (
    <EuiProvider>
      <DatasetSettingsFieldsLayout
        control={control}
        fields={fields}
        testSubjPrefix="datasetWizard"
        columns={columns}
      />
    </EuiProvider>
  );
};

describe('DatasetSettingsFieldsLayout', () => {
  it('renders fields in inline rows of three', () => {
    const { getByTestId } = render(
      <TestHarness fields={['delimiter', 'datetime_format', 'mode']} />
    );

    expect(getByTestId('datasetWizardSettingsField-delimiter')).toBeInTheDocument();
    expect(getByTestId('datasetWizardSettingsField-datetime_format')).toBeInTheDocument();
    expect(getByTestId('datasetWizardSettingsField-mode')).toBeInTheDocument();
  });

  it('keeps equal column widths when the last row is not full', () => {
    const { container, getByTestId } = render(
      <TestHarness columns={3} fields={['mode', 'quote', 'escape', 'delimiter', 'datetime_format']} />
    );

    expect(getByTestId('datasetWizardSettingsField-mode')).toBeInTheDocument();
    expect(getByTestId('datasetWizardSettingsField-datetime_format')).toBeInTheDocument();

    const rows = container.querySelectorAll('.euiFlexGroup');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.querySelectorAll('.euiFlexItem')).toHaveLength(3);
    expect(rows[1]?.querySelectorAll('.euiFlexItem')).toHaveLength(3);
  });

  it('renders nothing when there are no fields', () => {
    const { container } = render(<TestHarness fields={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
