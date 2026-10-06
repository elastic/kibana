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
import type { CreateDatasetFormValues } from '../create_dataset_form_state';
import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import { emptyDatasetFormValues } from '../dataset_form_initial_values';
import type { DatasetWizardStepContent } from '../types';
import { WizardStepProvider } from '../wizard_step_context';
import { StepMapping } from './step_mapping';

const docLinksMock = {
  links: {
    elasticsearch: {
      mappingReference: '',
      mappingKeyword: '',
      mappingBoolean: '',
      mappingIp: '',
      mappingDate: '',
      mappingUnsignedLong: '',
      mappingNumber: '',
    },
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

const renderStep = () => {
  const updateContent = jest.fn<void, [DatasetWizardStepContent]>();
  const emptyValues = emptyDatasetFormValues();
  const defaultValues: CreateDatasetFormValues = {
    ...emptyValues,
    settings: { ...emptyValues.settings, format: 'csv' },
    mappings: {
      ...emptyValues.mappings,
      fields: emptyValues.mappings.fields.map((field) => ({ ...field, path: 'event_time' })),
    },
  };

  const Wrapper = () => {
    const methods = useForm<CreateDatasetFormValues>({ defaultValues });
    return (
      <I18nProvider>
        <EuiProvider>
          <KibanaContextProvider services={{ docLinks: docLinksMock }}>
            <FormProvider {...methods}>
              <WizardStepProvider value={updateContent}>
                <StepMapping />
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
    if (calls.length === 0) throw new Error('StepMapping has not reported its content yet');
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

describe('StepMapping', () => {
  it('fails validation while the schema resolution combo box holds text that is not a selected option', async () => {
    const { getByTestId, queryByText, getStepContent, validate } = renderStep();

    await act(async () => {
      fireEvent.click(getByTestId('createDatasetWizardSchemaResolutionToggle'));
    });
    const input = getByTestId('createDatasetWizardSchemaResolution').querySelector('input');
    if (!input) throw new Error('schema resolution input not found');
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
  });
});
