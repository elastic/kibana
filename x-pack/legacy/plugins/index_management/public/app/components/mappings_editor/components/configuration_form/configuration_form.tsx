/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';
import { EuiSpacer } from '@elastic/eui';

import { useForm, Form, SerializerFunc } from '../../shared_imports';
import { Types, useDispatch } from '../../mappings_state';
import { DynamicMappingSection } from './dynamic_mapping_section';
import { SourceFieldSection } from './source_field_section';
import { configurationFormSchema } from './configuration_form_schema';

type MappingsConfiguration = Types['MappingsConfiguration'];

interface Props {
  defaultValue?: MappingsConfiguration;
}

const formSerializer: SerializerFunc<MappingsConfiguration> = formData => {
  const {
    dynamicMapping: {
      enabled: dynamicMappingsEnabled,
      throwErrorsForUnmappedFields,
      numeric_detection,
      date_detection,
      dynamic_date_formats,
    },
    sourceField,
  } = formData;

  const dynamic = dynamicMappingsEnabled ? true : throwErrorsForUnmappedFields ? 'strict' : false;

  return {
    dynamic,
    numeric_detection,
    date_detection,
    dynamic_date_formats,
    _source: { ...sourceField },
  };
};

const formDeserializer = (formData: { [key: string]: any }) => {
  const {
    dynamic,
    numeric_detection,
    date_detection,
    dynamic_date_formats,
    _source: { enabled, includes, excludes },
  } = formData;

  return {
    dynamicMapping: {
      enabled: dynamic === true || dynamic === undefined,
      throwErrorsForUnmappedFields: dynamic === 'strict',
      numeric_detection,
      date_detection,
      dynamic_date_formats,
    },
    sourceField: {
      enabled: enabled === true || enabled === undefined,
      includes,
      excludes,
    },
  };
};

export const ConfigurationForm = React.memo(({ defaultValue }: Props) => {
  const { form } = useForm<MappingsConfiguration>({
    schema: configurationFormSchema,
    serializer: formSerializer,
    deserializer: formDeserializer,
    defaultValue,
  });
  const dispatch = useDispatch();

  useEffect(() => {
    const subscription = form.subscribe(updatedConfiguration => {
      dispatch({ type: 'configuration.update', value: updatedConfiguration });
    });
    return subscription.unsubscribe;
  }, [form]);

  useEffect(() => {
    // If the defaultValue has changed it means that we have loaded a new JSON
    // we need to reset the form to update the fields values.
    form.reset({ resetValues: true });
  }, [defaultValue]);

  return (
    <Form form={form}>
      <DynamicMappingSection />
      <EuiSpacer size="xl" />
      <SourceFieldSection />
    </Form>
  );
});
