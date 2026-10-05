/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';

import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { DatasetSettings } from '../../../common';
import type { CreateDatasetFormValues } from '../create_dataset_form_state';
import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import { dataSetToFormValues } from '../dataset_form_initial_values';
import type { DatasetWizardStepContent } from '../types';
import { WizardStepProvider } from '../wizard_step_context';
import { StepAdditional } from './step_additional';

const docLinksMock = {
  links: {
    dataFederation: {
      overview: '',
      quickstart: '',
      dataSources: '',
      datasets: '',
      datasetSettings: '',
      authentication: '',
      staticCredentials: '',
      federatedIdentity: '',
      querying: '',
      security: '',
    },
  },
};

const renderStep = (settings: DatasetSettings) => {
  const updateContent = jest.fn<void, [DatasetWizardStepContent]>();
  const defaultValues = dataSetToFormValues({
    name: 'logs-dataset',
    data_source: 'source-1',
    resource: 's3://bucket/*',
    settings,
  });

  const Wrapper = () => {
    const methods = useForm<CreateDatasetFormValues>({ defaultValues });
    return (
      <I18nProvider>
        <EuiProvider>
          <KibanaContextProvider services={{ docLinks: docLinksMock }}>
            <FormProvider {...methods}>
              <WizardStepProvider value={updateContent}>
                <StepAdditional />
              </WizardStepProvider>
            </FormProvider>
          </KibanaContextProvider>
        </EuiProvider>
      </I18nProvider>
    );
  };

  const view = render(<Wrapper />);

  const getStepContent = (): DatasetWizardStepContent => {
    const { calls } = updateContent.mock;
    if (calls.length === 0) throw new Error('StepAdditional has not reported its content yet');
    return calls[calls.length - 1][0];
  };

  const validate = async (): Promise<boolean> => {
    let isValid = false;
    await act(async () => {
      isValid = await getStepContent().validate();
    });
    return isValid;
  };

  return { ...view, getStepContent, validate };
};

describe('StepAdditional', () => {
  it('passes validation with the default settings', async () => {
    const { getStepContent, validate } = renderStep({ format: 'csv' });

    expect(getStepContent().isValid).toBe(true);
    expect(await validate()).toBe(true);
    expect(getStepContent().isValid).toBe(true);
  });

  it.each([
    ['escape character', { format: 'csv' }, 'createDatasetSettingsEscape', '\\a', '/'],
    [
      'max error ratio',
      { format: 'parquet', error_mode: 'skip_row' },
      'createDatasetSettingsMaxErrorRatio',
      '2',
      '0.5',
    ],
  ] as const)(
    'fails validation while the %s is invalid and passes once it is fixed',
    async (_label, settings, testSubj, invalidValue, validValue) => {
      const { getByTestId, getStepContent, validate } = renderStep(settings);

      fireEvent.change(getByTestId(testSubj), { target: { value: invalidValue } });
      // isValid stays true until validation has been attempted.
      expect(getStepContent().isValid).toBe(true);

      expect(await validate()).toBe(false);
      expect(getByTestId(testSubj)).toHaveAttribute('aria-invalid', 'true');
      expect(getStepContent().isValid).toBe(false);

      await act(async () => {
        fireEvent.change(getByTestId(testSubj), { target: { value: validValue } });
      });
      expect(getByTestId(testSubj)).not.toHaveAttribute('aria-invalid', 'true');
      expect(getStepContent().isValid).toBe(true);
      expect(await validate()).toBe(true);
    }
  );

  it('fails validation when a saved delimiter is invalid', async () => {
    const { getByText, getStepContent, validate } = renderStep({ format: 'csv', delimiter: 'ab' });

    expect(await validate()).toBe(false);
    expect(getByText(createDatasetWizardStrings.settingsDelimiterInvalid)).toBeInTheDocument();
    expect(getStepContent().isValid).toBe(false);
  });

  it.each([
    ['quote mode', { format: 'csv', mode: 'quoted' }, 'createDatasetSettingsMode'],
    ['header row', { format: 'csv' }, 'createDatasetSettingsHeaderRow'],
    ['trim whitespace', { format: 'csv' }, 'createDatasetSettingsTrimSpaces'],
    ['partition detection', { format: 'parquet' }, 'createDatasetSettingsPartitionDetection'],
    ['error mode', { format: 'parquet' }, 'createDatasetSettingsErrorMode'],
  ] as const)(
    'fails validation while the %s combo box holds text that is not a selected option',
    async (_label, settings, testSubj) => {
      const { getByTestId, queryByText, getStepContent, validate } = renderStep(settings);
      const input = getByTestId(testSubj).querySelector('input');
      if (!input) throw new Error(`${testSubj} input not found`);

      await act(async () => {
        fireEvent.change(input, { target: { value: 'bogus' } });
        fireEvent.blur(input);
      });

      expect(await validate()).toBe(false);
      expect(queryByText(createDatasetWizardStrings.comboBoxSelectValidOption)).not.toBeNull();
      expect(getStepContent().isValid).toBe(false);

      await act(async () => {
        fireEvent.change(input, { target: { value: '' } });
      });
      expect(queryByText(createDatasetWizardStrings.comboBoxSelectValidOption)).toBeNull();
      expect(getStepContent().isValid).toBe(true);
      expect(await validate()).toBe(true);
    }
  );

  it('passes validation once a valid option replaces text that is not a selected option', async () => {
    const { getByTestId, getAllByTestId, queryByText, getStepContent, validate } = renderStep({
      format: 'csv',
    });
    const input = getByTestId('createDatasetSettingsHeaderRow').querySelector('input');
    if (!input) throw new Error('header row input not found');

    // Partial text keeps the matching option listed without resolving to it.
    await act(async () => {
      fireEvent.change(input, { target: { value: 'fa' } });
    });
    expect(await validate()).toBe(false);
    expect(getStepContent().isValid).toBe(false);

    const candidates = getAllByTestId('createDatasetSettingsHeaderRowOption-false');
    const option = candidates.find((el) => el.getAttribute('role') === 'option') ?? candidates[0];
    await act(async () => {
      fireEvent.click(option);
    });

    expect(input).toHaveValue(createDatasetWizardStrings.falseLabel);
    expect(queryByText(createDatasetWizardStrings.comboBoxSelectValidOption)).toBeNull();
    expect(getStepContent().isValid).toBe(true);
    expect(await validate()).toBe(true);
  });
});
