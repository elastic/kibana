/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import {
  UseField,
  Form,
} from '../../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/hook_form_lib';
import { Field } from '../../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/components';

import { parametersDefinition } from '../../config';
import { ANALYZERS_OPTIONS, INDEX_OPTIONS } from '../../constants';

interface Props {
  fieldPathPrefix: string;
  isEditMode: boolean;
  form: Form;
}

export const TextAdvancedSettings = ({ fieldPathPrefix, form, isEditMode }: Props) => {
  return (
    <div>
      <EuiFlexGroup>
        <EuiFlexItem>
          <UseField
            path={`${fieldPathPrefix}analyzer`}
            form={form}
            defaultValue={isEditMode ? undefined : 'index_default'}
            config={parametersDefinition.analyzer.fieldConfig}
            component={Field}
            componentProps={{
              fieldProps: {
                options: ANALYZERS_OPTIONS,
              },
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField
            path={`${fieldPathPrefix}search_analyzer`}
            form={form}
            defaultValue={isEditMode ? undefined : 'index_default'}
            config={parametersDefinition.search_analyzer.fieldConfig}
            component={Field}
            componentProps={{
              fieldProps: {
                options: ANALYZERS_OPTIONS,
              },
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField
            path={`${fieldPathPrefix}search_quote_analyzer`}
            form={form}
            defaultValue={isEditMode ? undefined : 'index_default'}
            config={parametersDefinition.search_quote_analyzer.fieldConfig}
            component={Field}
            componentProps={{
              fieldProps: {
                options: ANALYZERS_OPTIONS,
              },
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField
            path={`${fieldPathPrefix}index_options`}
            form={form}
            defaultValue={isEditMode ? undefined : 'docs'}
            config={parametersDefinition.index_options.fieldConfig}
            component={Field}
            componentProps={{
              fieldProps: {
                options: INDEX_OPTIONS,
              },
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
