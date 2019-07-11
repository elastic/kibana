/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import {
  UseField,
  Form,
} from '../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/hook_form_lib';
import { Field } from '../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/components';
import { DataTypeConfig } from '../data_types_config';
import { parameters, ParameterName } from '../parameters';

interface Props {
  form: Form;
  typeConfig: DataTypeConfig | null;
  fieldPathPrefix?: string;
}

const splitParametersIntoRows = (params: ParameterName[] | ParameterName[][]): ParameterName[][] =>
  Array.isArray(params[0]) ? (params as ParameterName[][]) : ([params] as ParameterName[][]);

export const PropertyCommonParameters = ({ form, typeConfig, fieldPathPrefix = '' }: Props) => {
  if (!typeConfig || !typeConfig.commonParameters) {
    return null;
  }
  return (
    <Fragment>
      {splitParametersIntoRows(typeConfig.commonParameters).map((row, i) => (
        <div key={i}>
          <EuiFlexGroup>
            {row.map(parameter => (
              <EuiFlexItem key={parameter} grow={false}>
                <UseField
                  form={form}
                  path={fieldPathPrefix + parameter}
                  config={parameters[parameter]!.fieldConfig}
                  component={Field}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </div>
      ))}
    </Fragment>
  );
};
