/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { EuiTitle, EuiSpacer } from '@elastic/eui';
import {
  useForm,
  UseField,
} from '../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/hook_form_lib';
import {
  FormRow,
  Field,
} from '../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/components';

import { schema } from './form.schema';
import { PropertiesManager } from './components';
import { propertiesArrayToObject, propertiesObjectToArray } from './helpers';

interface Props {
  setGetDataHandler: (handler: () => Promise<{ isValid: boolean; data: Mappings }>) => void;
  FormattedMessage: typeof ReactIntl.FormattedMessage;
  defaultValue?: Mappings;
  areErrorsVisible?: boolean;
}

export interface Mappings {
  [key: string]: any;
}

const serializer = (data: Record<string, unknown>): Record<string, unknown> => ({
  ...data,
  properties: propertiesArrayToObject(data.properties as any[]),
});

const deSerializer = (data: Record<string, unknown>): Record<string, unknown> => ({
  ...data,
  properties: propertiesObjectToArray(data.properties as { [key: string]: any }),
});

export const MappingsEditor = ({
  setGetDataHandler,
  FormattedMessage,
  areErrorsVisible = true,
  defaultValue,
}: Props) => {
  const { form } = useForm({ schema, serializer, deSerializer, defaultValue });

  useEffect(() => {
    setGetDataHandler(form.onSubmit);
  }, [form]);

  return (
    <div className="mappings-editor">
      {/* Global Mappings configuration */}
      <FormRow title="Configuration" description="Global settings for the index mappings">
        <UseField
          path="dynamic"
          form={form}
          componentProps={{
            fieldProps: {
              options: [
                { value: true, text: 'true' },
                { value: false, text: 'false' },
                { value: 'strict', text: 'strict' },
              ],
            },
          }}
          component={Field}
        />
        <UseField path="date_detection" form={form} component={Field} />
        <UseField path="numeric_detection" form={form} component={Field} />
        <UseField path="dynamic_date_formats" form={form} component={Field} />
      </FormRow>

      {/* Document fields */}
      <EuiTitle size="s">
        <h4>Document fields</h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <PropertiesManager form={form} depthLevel="0" />
    </div>
  );
};
