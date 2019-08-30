/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';
import { EuiForm } from '@elastic/eui';

import {
  useForm,
  UseField,
  FormProvider,
} from '../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/hook_form_lib';

import {
  FormRow,
  Field,
} from '../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/components';

import { schema } from '../form.schema';
import { DYNAMIC_SETTING_OPTIONS } from '../constants';

interface Props {
  setGetDataHandler: (handler: () => Promise<{ isValid: boolean; data: any }>) => void;
  onValidityChange: (isValid: boolean) => void;
  defaultValue?: any;
}

export const ConfigurationForm = ({ setGetDataHandler, defaultValue, onValidityChange }: Props) => {
  const { form } = useForm({ schema, defaultValue });

  useEffect(() => {
    setGetDataHandler(form.submit);
    onValidityChange(form.isValid);
  }, [form]);

  return (
    <FormProvider form={form}>
      <EuiForm className="mappings-editor">
        <FormRow title="Configuration" description="Global settings for the index mappings">
          <UseField
            path="dynamic"
            componentProps={{
              fieldProps: { options: DYNAMIC_SETTING_OPTIONS },
            }}
            component={Field}
          />
          <UseField path="date_detection" component={Field} />
          <UseField path="numeric_detection" component={Field} />
          <UseField path="dynamic_date_formats" component={Field} />
        </FormRow>
      </EuiForm>
    </FormProvider>
  );
};
