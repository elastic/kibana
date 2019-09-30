/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';

import { useForm, getUseField, Form, OnFormUpdateArg } from '../../shared_imports';
import { FormRow, Field } from '../../shared_imports';
import { DYNAMIC_SETTING_OPTIONS } from '../../field_configuration';
import { MappingsConfiguration, useDispatch } from '../../mappings_state';
import { schema } from './form.schema';

export type ConfigurationUpdateHandler = (arg: OnFormUpdateArg<MappingsConfiguration>) => void;

interface Props {
  defaultValue?: MappingsConfiguration;
}

const UseField = getUseField({ component: Field });

export const ConfigurationForm = React.memo(({ defaultValue }: Props) => {
  const { form } = useForm<MappingsConfiguration>({ schema, defaultValue });
  const dispatch = useDispatch();

  useEffect(() => {
    const subscription = form.subscribe(updatedConfiguration => {
      dispatch({ type: 'updateConfiguration', value: updatedConfiguration });
    });
    return subscription.unsubscribe;
  }, [form]);

  return (
    <Form form={form} className="mappings-editor">
      <FormRow title="Configuration" description="Global settings for the index mappings">
        <UseField
          path="dynamic"
          componentProps={{
            euiFieldProps: { options: DYNAMIC_SETTING_OPTIONS },
          }}
        />
        <UseField path="date_detection" />
        <UseField path="numeric_detection" />
        <UseField path="dynamic_date_formats" />
      </FormRow>
    </Form>
  );
});
