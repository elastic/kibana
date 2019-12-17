/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';

import { EuiSpacer } from '@elastic/eui';

import { useForm, Form, SerializerFunc } from '../../shared_imports';
import { Types, useDispatch } from '../../mappings_state';
import { configurationFormSchema } from './configuration_form_schema';
import { DynamicMapping } from './dynamic_mapping';
import { SourceField } from './source_field';

type MappingsConfiguration = Types['MappingsConfiguration'];

interface Props {
  defaultValue?: MappingsConfiguration;
}

const formSerializer: SerializerFunc<MappingsConfiguration> = formData => {
  const {
    enabled: dynamicMappingsEnabled,
    throwErrorsForUnmappedFields,
    ...configurationData
  } = formData;

  const dynamic = dynamicMappingsEnabled ? true : throwErrorsForUnmappedFields ? 'strict' : false;

  return {
    ...configurationData,
    dynamic,
  };
};

export const ConfigurationForm = React.memo(({ defaultValue }: Props) => {
  const { form } = useForm<MappingsConfiguration>({
    schema: configurationFormSchema,
    serializer: formSerializer,
    defaultValue,
  });
  const dispatch = useDispatch();

  useEffect(() => {
    const subscription = form.subscribe(updatedConfiguration => {
      dispatch({ type: 'configuration.update', value: updatedConfiguration });
    });
    return subscription.unsubscribe;
  }, [form]);

  return (
    <Form form={form}>
      <DynamicMapping />
      <EuiSpacer size="xl" />
      <SourceField />
    </Form>
  );
});
