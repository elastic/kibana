/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';

import { useForm, UseField, Form, OnFormUpdateArg } from '../../shared_imports';
import { FormRow, Field } from '../../shared_imports';
import { DYNAMIC_SETTING_OPTIONS } from '../../field_configuration';
import { schema } from './form.schema';

export type ConfigurationUpdateHandler = (arg: OnFormUpdateArg<MappingsConfiguration>) => void;

export interface MappingsConfiguration {
  dynamic: boolean | string;
  date_detection: boolean;
  numeric_detection: boolean;
  dynamic_date_formats: string[];
}

interface Props {
  onUpdate: ConfigurationUpdateHandler;
  defaultValue?: any;
}

export const ConfigurationForm = React.memo(({ onUpdate, defaultValue }: Props) => {
  const { form } = useForm<MappingsConfiguration>({ schema, defaultValue });

  useEffect(() => {
    const subscription = form.subscribe(onUpdate);
    return subscription.unsubscribe;
  }, [form, onUpdate]);

  return (
    <Form form={form} className="mappings-editor">
      <FormRow title="Configuration" description="Global settings for the index mappings">
        <UseField
          path="dynamic"
          componentProps={{
            euiFieldProps: { options: DYNAMIC_SETTING_OPTIONS },
          }}
          component={Field}
        />
        <UseField path="date_detection" component={Field} />
        <UseField path="numeric_detection" component={Field} />
        <UseField path="dynamic_date_formats" component={Field} />
      </FormRow>
    </Form>
  );
});
