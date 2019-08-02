/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';

import {
  UseField,
  Form,
  FieldConfig,
} from '../../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/hook_form_lib';
import { Field } from '../../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/components';

import { parametersDefinition, ParameterName } from '../../config';
import { ANALYZERS_OPTIONS, INDEX_OPTIONS, SIMILARITY_ALGORITHM_OPTIONS } from '../../constants';

interface Props {
  fieldPathPrefix: string;
  isEditMode: boolean;
  form: Form;
}

const fieldConfig = (param: ParameterName): FieldConfig =>
  parametersDefinition[param].fieldConfig || {};

const defaultValueParam = (param: ParameterName): unknown =>
  typeof fieldConfig(param).defaultValue !== 'undefined' ? fieldConfig(param).defaultValue : '';

export const KeywordAdvancedSettings = ({ fieldPathPrefix, form, isEditMode }: Props) => {
  return (
    <Fragment>
      <div>
        <EuiFlexGroup>
          <EuiFlexItem>
            <UseField
              path={`${fieldPathPrefix}normalizer`}
              form={form}
              defaultValue={isEditMode ? undefined : defaultValueParam('normalizer')}
              config={fieldConfig('normalizer')}
              component={Field}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <UseField
              path={`${fieldPathPrefix}null_value`}
              form={form}
              defaultValue={isEditMode ? undefined : defaultValueParam('null_value')}
              config={fieldConfig('null_value')}
              component={Field}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <UseField
              path={`${fieldPathPrefix}boost`}
              form={form}
              defaultValue={isEditMode ? undefined : defaultValueParam('boost')}
              config={fieldConfig('boost')}
              component={Field}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <UseField
              path={`${fieldPathPrefix}ignore_above`}
              form={form}
              defaultValue={isEditMode ? undefined : defaultValueParam('ignore_above')}
              config={fieldConfig('ignore_above')}
              component={Field}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      <div>
        <EuiFlexGroup>
          <EuiFlexItem>
            <UseField
              path={`${fieldPathPrefix}index_options`}
              form={form}
              defaultValue={isEditMode ? undefined : defaultValueParam('index_options')}
              config={fieldConfig('index_options')}
              component={Field}
              componentProps={{
                fieldProps: {
                  options: INDEX_OPTIONS,
                },
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <UseField
              path={`${fieldPathPrefix}similarity`}
              form={form}
              defaultValue={isEditMode ? undefined : defaultValueParam('similarity')}
              config={fieldConfig('similarity')}
              component={Field}
              componentProps={{
                fieldProps: {
                  options: SIMILARITY_ALGORITHM_OPTIONS,
                },
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      <div>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <UseField
              path={`${fieldPathPrefix}eager_global_ordinals`}
              form={form}
              defaultValue={isEditMode ? undefined : defaultValueParam('eager_global_ordinals')}
              config={fieldConfig('eager_global_ordinals')}
              component={Field}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <UseField
              path={`${fieldPathPrefix}index_phrases`}
              form={form}
              defaultValue={isEditMode ? undefined : defaultValueParam('index_phrases')}
              config={fieldConfig('index_phrases')}
              component={Field}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <UseField
              path={`${fieldPathPrefix}norms`}
              form={form}
              defaultValue={isEditMode ? undefined : defaultValueParam('norms')}
              config={fieldConfig('norms')}
              component={Field}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <UseField
              path={`${fieldPathPrefix}split_queries_on_whitespace`}
              form={form}
              defaultValue={
                isEditMode ? undefined : defaultValueParam('split_queries_on_whitespace')
              }
              config={fieldConfig('split_queries_on_whitespace')}
              component={Field}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </Fragment>
  );
};
