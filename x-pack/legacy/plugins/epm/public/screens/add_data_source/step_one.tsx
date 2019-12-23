/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import {
  EuiComboBox,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiCheckboxGroup,
  EuiCheckboxGroupOption,
} from '@elastic/eui';
import { FormState } from './add_data_source_form';

interface AddDataSourceFormProps {
  formState: FormState;
  onDatasetChange: (name: string) => void;
  onNameChange: (evt: React.ChangeEvent<HTMLInputElement>) => void;
  datasetCheckboxes: EuiCheckboxGroupOption[];
  policyOptions: FormState['policies'];
  onPolicyChange: (selectedOptions: AddDataSourceFormProps['policyOptions']) => unknown;
}

export const StepOne = ({
  formState,
  onDatasetChange,
  onNameChange,
  datasetCheckboxes,
  onPolicyChange,
  policyOptions,
}: AddDataSourceFormProps) => {
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
          <EuiFormRow label="Data source name" describedByIds={['data-source-name']}>
            <EuiFieldText
              name="datasourceName"
              value={formState.datasourceName}
              onChange={onNameChange}
            />
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
          <EuiFormRow describedByIds={['select-inputs']}>
            <EuiCheckboxGroup
              options={datasetCheckboxes}
              idToSelectedMap={formState.datasets}
              onChange={onDatasetChange}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
        <EuiHorizontalRule />
        <EuiDescribedFormGroup
          idAria="data-source-policy"
          title={<h3>Assign data source to policy</h3>}
          description={
            <Fragment>
              Policies can help you maintain a group of data sources across a fleet of agents.
            </Fragment>
          }
        >
          <EuiFormRow label="Policy name" describedByIds={['policy-name']}>
            <EuiComboBox
              placeholder="Select a policy"
              options={policyOptions}
              selectedOptions={formState.policies}
              onChange={onPolicyChange}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
      </EuiForm>
    </Fragment>
  );
};
