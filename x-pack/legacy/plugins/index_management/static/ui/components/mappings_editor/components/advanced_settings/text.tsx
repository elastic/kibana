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
} from '../../../../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';
import { Field } from '../../../../../../../../../../src/plugins/es_ui_shared/static/forms/components';

import { parametersDefinition, ParameterName } from '../../config';
import { ANALYZERS_OPTIONS, INDEX_OPTIONS, SIMILARITY_ALGORITHM_OPTIONS } from '../../constants';

interface Props {
  isEditMode: boolean;
  form: Form;
}

const fieldConfig = (param: ParameterName): FieldConfig =>
  parametersDefinition[param].fieldConfig || {};

const defaultValueParam = (param: ParameterName): unknown =>
  typeof fieldConfig(param).defaultValue !== 'undefined' ? fieldConfig(param).defaultValue : '';

export const TextAdvancedSettings = ({ form, isEditMode }: Props) => {
  return (
    <Fragment>
      <div>
        <EuiFlexGroup>
          <EuiFlexItem>
            <UseField
              path="analyzer"
              defaultValue={isEditMode ? undefined : defaultValueParam('analyzer')}
              config={fieldConfig('analyzer')}
              component={Field}
              componentProps={{
                euiFieldProps: {
                  options: ANALYZERS_OPTIONS,
                },
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <UseField
              path="search_analyzer"
              defaultValue={isEditMode ? undefined : defaultValueParam('search_analyzer')}
              config={fieldConfig('search_analyzer')}
              component={Field}
              componentProps={{
                euiFieldProps: {
                  options: ANALYZERS_OPTIONS,
                },
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <UseField
              path="search_quote_analyzer"
              defaultValue={isEditMode ? undefined : defaultValueParam('search_quote_analyzer')}
              config={fieldConfig('search_quote_analyzer')}
              component={Field}
              componentProps={{
                euiFieldProps: {
                  options: ANALYZERS_OPTIONS,
                },
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <UseField
              path="index_options"
              defaultValue={isEditMode ? undefined : defaultValueParam('index_options')}
              config={fieldConfig('index_options')}
              component={Field}
              componentProps={{
                euiFieldProps: {
                  options: INDEX_OPTIONS,
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
              path="eager_global_ordinals"
              defaultValue={isEditMode ? undefined : defaultValueParam('eager_global_ordinals')}
              config={fieldConfig('eager_global_ordinals')}
              component={Field}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <UseField
              path="index_phrases"
              defaultValue={isEditMode ? undefined : defaultValueParam('index_phrases')}
              config={fieldConfig('index_phrases')}
              component={Field}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <UseField
              path="norms"
              defaultValue={isEditMode ? undefined : defaultValueParam('norms')}
              config={fieldConfig('norms')}
              component={Field}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <UseField
              path="term_vector"
              defaultValue={isEditMode ? undefined : defaultValueParam('term_vector')}
              config={fieldConfig('term_vector')}
              component={Field}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      <div>
        <EuiFlexGroup>
          <EuiFlexItem>
            <UseField
              path="boost"
              defaultValue={isEditMode ? undefined : defaultValueParam('boost')}
              config={fieldConfig('boost')}
              component={Field}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="Index prefixes" fullWidth>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <UseField
                    path="index_prefixes.min_chars"
                    defaultValue={
                      isEditMode
                        ? undefined
                        : (parametersDefinition.index_prefixes.fieldConfig! as any).min_chars
                            .defaultValue
                    }
                    config={{
                      ...(parametersDefinition.index_prefixes.fieldConfig! as any).min_chars,
                      fieldsToValidateOnChange: [
                        'index_prefixes.min_chars',
                        'index_prefixes.max_chars',
                      ],
                    }}
                    component={Field}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <UseField
                    path="index_prefixes.max_chars"
                    defaultValue={
                      isEditMode
                        ? undefined
                        : (parametersDefinition.index_prefixes.fieldConfig! as any).max_chars
                            .defaultValue
                    }
                    config={{
                      ...(parametersDefinition.index_prefixes.fieldConfig! as any).max_chars,
                      fieldsToValidateOnChange: [
                        'index_prefixes.min_chars',
                        'index_prefixes.max_chars',
                      ],
                    }}
                    component={Field}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <UseField
              path="position_increment_gap"
              defaultValue={isEditMode ? undefined : defaultValueParam('position_increment_gap')}
              config={fieldConfig('position_increment_gap')}
              component={Field}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <UseField
              path="similarity"
              defaultValue={isEditMode ? undefined : defaultValueParam('similarity')}
              config={fieldConfig('similarity')}
              component={Field}
              componentProps={{
                euiFieldProps: {
                  options: SIMILARITY_ALGORITHM_OPTIONS,
                },
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </Fragment>
  );
};
