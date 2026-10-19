/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { I18nProvider } from '@kbn/i18n-react';

import type { CreateDatasetFormValues } from '../../create_dataset_form_state';
import { emptyDatasetFormValues } from '../../dataset_form_initial_values';
import { createDatasetWizardStrings } from '../../create_dataset_wizard_i18n';
import { SchemaResolutionField } from './schema_resolution_field';

const renderField = ({
  defaultSchemaResolution = '',
  isDisabled,
}: {
  defaultSchemaResolution?: CreateDatasetFormValues['settings']['schema_resolution'];
  isDisabled?: boolean;
} = {}) => {
  const Wrapper = () => {
    const methods = useForm<CreateDatasetFormValues>({
      defaultValues: {
        ...emptyDatasetFormValues(),
        settings: {
          ...emptyDatasetFormValues().settings,
          schema_resolution: defaultSchemaResolution,
        },
      },
    });

    const schemaResolution = useWatch({
      control: methods.control,
      name: 'settings.schema_resolution',
    });

    return (
      <FormProvider {...methods}>
        <SchemaResolutionField isDisabled={isDisabled} />
        <div data-test-subj="schemaResolutionValue">{schemaResolution}</div>
      </FormProvider>
    );
  };

  return render(
    <EuiProvider>
      <I18nProvider>
        <Wrapper />
      </I18nProvider>
    </EuiProvider>
  );
};

const openAccordion = async (getByTestId: ReturnType<typeof render>['getByTestId']) => {
  await act(async () => {
    fireEvent.click(getByTestId('createDatasetWizardSchemaResolutionToggle'));
  });
  await waitFor(() =>
    expect(getByTestId('createDatasetWizardSchemaResolution')).toBeInTheDocument()
  );
};

const openComboBox = async (getByTestId: ReturnType<typeof render>['getByTestId']) => {
  const combo = getByTestId('createDatasetWizardSchemaResolution');
  await act(async () => {
    fireEvent.click(combo.querySelector('input') ?? combo);
  });
};

describe('SchemaResolutionField', () => {
  it('renders collapsed by default and opens on toggle', async () => {
    const { getByTestId, queryByTestId, getByRole } = renderField();

    expect(getByTestId('createDatasetWizardSchemaResolutionToggle')).toBeVisible();
    expect(queryByTestId('createDatasetWizardSchemaResolution')).toBeNull();

    await openAccordion(getByTestId);

    expect(getByRole('combobox')).toHaveAttribute(
      'placeholder',
      createDatasetWizardStrings.settingsSchemaResolutionPlaceholder
    );
  });

  it('selects and clears schema resolution, updating form state', async () => {
    const { getByTestId, getAllByTestId } = renderField();

    await openAccordion(getByTestId);
    await openComboBox(getByTestId);

    // EuiComboBox renders both the outer `li[role="option"]` and the inner custom content
    // with the same test subject. Click the element with role="option".
    const strictCandidates = await waitFor(() =>
      getAllByTestId('createDatasetWizardSchemaResolutionOption-strict')
    );
    const strictOption =
      strictCandidates.find((el) => el.getAttribute('role') === 'option') ?? strictCandidates[0];

    await act(async () => {
      fireEvent.click(strictOption);
    });

    expect(getByTestId('schemaResolutionValue')).toHaveTextContent('strict');
    expect(getByTestId('createDatasetWizardSchemaResolution')).toHaveTextContent(
      createDatasetWizardStrings.settingsSchemaResolutionStrict
    );

    await act(async () => {
      fireEvent.click(getByTestId('comboBoxClearButton'));
    });

    expect(getByTestId('schemaResolutionValue')).toHaveTextContent('');
    expect(getByTestId('createDatasetWizardSchemaResolution')).not.toHaveTextContent(
      createDatasetWizardStrings.settingsSchemaResolutionStrict
    );
  });

  it('shows inline info with first_file_wins in EuiCode when open', async () => {
    const { getByTestId, getByText } = renderField();

    await openAccordion(getByTestId);

    const codeToken = getByText('first_file_wins');
    expect(codeToken.closest('code')).not.toBeNull();
    expect(getByText(createDatasetWizardStrings.settingsSchemaResolutionInfo)).toBeInTheDocument();
  });

  it('disables the combo box when isDisabled is true', async () => {
    const { getByTestId, getByRole } = renderField({ isDisabled: true });

    await openAccordion(getByTestId);

    expect(getByRole('combobox')).toBeDisabled();
  });
});
