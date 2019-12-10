/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import React, { Fragment } from 'react';

export const StepOneTemplate = () => {
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
            <EuiFieldText name="data-source-name" />
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
            <Fragment>
              <EuiSwitch
                name="switch"
                label="Collect access logs"
                checked={true}
                onChange={() => true}
              />
              <EuiSpacer size="s" />
              <EuiSwitch
                name="switch"
                label="Collect error logs"
                checked={true}
                onChange={() => true}
              />
              <EuiSpacer size="s" />
              <EuiSwitch
                name="switch"
                label="Collect metric logs"
                checked={true}
                onChange={() => true}
              />
            </Fragment>
          </EuiFormRow>
        </EuiDescribedFormGroup>
      </EuiForm>
    </Fragment>
  );
};
