/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiSpacer, EuiButton } from '@elastic/eui';

import {
  useForm,
  Form,
  UseField,
  FieldConfig,
} from '../../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';

import { fieldValidators } from '../../../../../../../../src/plugins/es_ui_shared/static/forms/helpers';
import { TextAreaField } from '../../../../../../../../src/plugins/es_ui_shared/static/forms/components';
import { CloudClusterConfiguration } from '../../../../common/types';
import { StepsState } from '../cloud_migrator';

const { emptyField } = fieldValidators;

interface Props {
  onUpdate(updatedData: {
    isComplete: boolean;
    data: { decoded: CloudClusterConfiguration; encoded: string };
  }): void;
  stepsState: StepsState;
  isEnabled: boolean;
}

const fieldConfig: FieldConfig = {
  validations: [
    { validator: emptyField('You need to insert your cloud cluster configuration.') },
    {
      validator: ({ value }) => {
        let decoded;
        try {
          decoded = JSON.parse(atob(value as string));
        } catch {
          // swallow errors
        }
        if (decoded === undefined) {
          return {
            message: 'Configuration could not be decoded ',
          };
        }
      },
    },
  ],
};

export const ReacCloudClusterConfig = ({ onUpdate, isEnabled, stepsState }: Props) => {
  const { form } = useForm({
    defaultValue: { cloudClusterConfig: stepsState.step1.data && stepsState.step1.data.encoded },
  });

  const readClusterConfig = async () => {
    const {
      data: { cloudClusterConfig },
      isValid,
    } = await form.submit();

    // Here we will send the encoded string to the server to read the config

    if (isValid) {
      const decodedConfig: CloudClusterConfiguration = JSON.parse(atob(cloudClusterConfig));
      onUpdate({ isComplete: true, data: { decoded: decodedConfig, encoded: cloudClusterConfig } });
    }
  };

  if (!isEnabled) {
    return null;
  }

  return (
    <>
      <p>
        Once your cloud cluster is created you will get a configuration text. You need to paste it
        here in order to start migrating your data.
      </p>
      <EuiSpacer size="l" />
      <Form form={form}>
        <UseField
          path="cloudClusterConfig"
          config={fieldConfig}
          component={TextAreaField}
          componentProps={{
            euiFieldProps: {
              placeholder: 'Copy and paste here the cloud cluster configuration generated.',
              ['aria-label']: 'Cloud cluster configuration',
            },
          }}
        />
        <EuiSpacer />
        <EuiButton color="primary" onClick={readClusterConfig}>
          Read cloud configuration
        </EuiButton>
      </Form>
    </>
  );
};
