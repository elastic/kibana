/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, Fragment } from 'react';
import { EuiTitle, EuiSpacer, EuiButton } from '@elastic/eui';
import {
  useForm,
  UseField,
  UseArray,
} from '../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/hook_form_lib';
import {
  FormRow,
  Field,
} from '../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/components';

import { schema } from './form.schema';
import { MappingsProperty } from './components';
import { propertiesArrayToObject } from './helpers';

interface Props {
  setGetDataHandler: (handler: () => Promise<{ isValid: boolean; data: Mappings }>) => void;
  FormattedMessage: typeof ReactIntl.FormattedMessage;
  defaultValue?: Mappings;
  areErrorsVisible?: boolean;
}

export interface Mappings {
  [key: string]: any;
}

const serializeData = (data: Record<string, unknown>): Record<string, unknown> => ({
  ...data,
  properties: propertiesArrayToObject(data.properties as any[]),
});

export const MappingsEditor = ({
  setGetDataHandler,
  FormattedMessage,
  areErrorsVisible = true,
  defaultValue = {},
}: Props) => {
  const { form } = useForm({ schema });

  useEffect(() => {
    setGetDataHandler(async () => {
      const { data, isValid } = await form.onSubmit();
      return { data: serializeData(data), isValid };
    });
  }, [form]);

  return (
    <Fragment>
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
      </FormRow>

      {/* Mappings properties */}
      <EuiTitle size="s">
        <h4>Properties</h4>
      </EuiTitle>

      <EuiSpacer size="s" />
      <UseArray path="properties" form={form}>
        {({ rows, addRow, removeRow }) => (
          <Fragment>
            {rows.map(({ id, rowPath, isNew }) => (
              <MappingsProperty
                key={id}
                fieldPathPrefix={`${rowPath}.`}
                form={form}
                onRemove={() => removeRow(id)}
              />
            ))}
            <EuiSpacer size="s" />
            <EuiButton color="primary" onClick={addRow}>
              Add property
            </EuiButton>
          </Fragment>
        )}
      </UseArray>
    </Fragment>
  );
};
