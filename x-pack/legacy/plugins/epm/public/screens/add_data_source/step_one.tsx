/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import {
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiCheckboxGroup,
  EuiCheckboxGroupOption,
} from '@elastic/eui';
import { FormState, isDatasetEnabled } from './add_data_source_form';

interface AddDataSourceFormProps {
  formState: FormState;
  onCheckboxChange: (name: string) => void;
  onTextChange: (evt: React.ChangeEvent<HTMLInputElement>) => void;
  datasetCheckboxes: EuiCheckboxGroupOption[];
  showErrors: boolean;
}

export const StepOne = ({
  formState,
  onCheckboxChange,
  onTextChange,
  datasetCheckboxes,
  showErrors,
}: AddDataSourceFormProps) => {
  const { datasourceName, datasets } = formState;
  return (
    <Fragment>
      <EuiForm>
        <EuiDescribedFormGroup
          idAria="data-source-name"
          title={<h3>Choose a name</h3>}
          description={
            <Fragment>
              Append a label to your data source name to help distinguish it from your other data
              sources.
            </Fragment>
          }
        >
          <EuiFormRow
            isInvalid={showErrors && datasourceName === ''}
            label="Data source name"
            describedByIds={['data-source-name']}
            error="This field is required"
          >
            <EuiFieldText name="datasourceName" value={datasourceName} onChange={onTextChange} />
          </EuiFormRow>
        </EuiDescribedFormGroup>
        <EuiHorizontalRule />
        <EuiDescribedFormGroup
          idAria="select-inputs"
          title={<h3>Select your inputs</h3>}
          description={
            <Fragment>Select the data you want to send to your Elastic Search cluster.</Fragment>
          }
        >
          <EuiFormRow
            describedByIds={['select-inputs']}
            isInvalid={showErrors && !isDatasetEnabled(datasets)}
            error="Select at least one input"
          >
            <EuiCheckboxGroup
              options={datasetCheckboxes}
              idToSelectedMap={datasets}
              onChange={onCheckboxChange}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
      </EuiForm>
    </Fragment>
  );
};
