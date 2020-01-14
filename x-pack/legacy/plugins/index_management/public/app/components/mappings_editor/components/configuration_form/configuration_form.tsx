/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useRef } from 'react';
import { EuiSpacer } from '@elastic/eui';

import { useForm, Form, SerializerFunc } from '../../shared_imports';
import { Types, useDispatch } from '../../mappings_state';
import { DynamicMappingSection } from './dynamic_mapping_section';
import { SourceFieldSection } from './source_field_section';
import { MetaFieldSection } from './meta_field_section';
import { configurationFormSchema } from './configuration_form_schema';

type MappingsConfiguration = Types['MappingsConfiguration'];

interface Props {
  defaultValue?: MappingsConfiguration;
}

const stringifyJson = (json: { [key: string]: any }) =>
  Object.keys(json).length ? JSON.stringify(json, null, 2) : '{\n\n}';

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
    metaField,
  } = formData;

  const dynamic = dynamicMappingsEnabled ? true : throwErrorsForUnmappedFields ? 'strict' : false;

  let parsedMeta;
  try {
    parsedMeta = JSON.parse(metaField);
  } catch {
    parsedMeta = {};
  }

  return {
    dynamic,
    numeric_detection,
    date_detection,
    dynamic_date_formats,
    _source: { ...sourceField },
    _meta: parsedMeta,
  };
};

const formDeserializer = (formData: { [key: string]: any }) => {
  const {
    dynamic,
    numeric_detection,
    date_detection,
    dynamic_date_formats,
    _source: { enabled, includes, excludes },
    _meta,
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
    metaField: stringifyJson(_meta),
  };
};

export const ConfigurationForm = React.memo(({ defaultValue }: Props) => {
  const didMountRef = useRef(false);

  const { form } = useForm<MappingsConfiguration>({
    schema: configurationFormSchema,
    serializer: formSerializer,
    deserializer: formDeserializer,
    defaultValue,
  });
  const dispatch = useDispatch();

  useEffect(() => {
    const subscription = form.subscribe(({ data, isValid, validate }) => {
      dispatch({
        type: 'configuration.update',
        value: {
          data,
          isValid,
          validate,
          submitForm: form.submit,
        },
      });
    });
    return subscription.unsubscribe;
  }, [form]);

  useEffect(() => {
    if (didMountRef.current) {
      // If the defaultValue has changed (it probably means that we have loaded a new JSON)
      // we need to reset the form to update the fields values.
      form.reset({ resetValues: true });
    } else {
      // Avoid reseting the form on component mount.
      didMountRef.current = true;
    }
  }, [defaultValue]);

  useEffect(() => {
    return () => {
      // On unmount => save in the state a snapshot of the current form data.
      dispatch({ type: 'configuration.save' });
    };
  }, []);

  return (
    <Form form={form} isInvalid={form.isSubmitted && !form.isValid} error={form.getErrors()}>
      <DynamicMappingSection />
      <EuiSpacer size="xl" />
      <MetaFieldSection />
      <EuiSpacer size="xl" />
      <SourceFieldSection />
    </Form>
  );
});
