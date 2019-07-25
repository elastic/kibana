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
import { parametersDefinition, ParameterName, DataTypeDefinition } from '../config';

interface Props {
  form: Form;
  typeDefinition: DataTypeDefinition | null;
  fieldPathPrefix?: string;
}

const parametersToRows = (params: ParameterName[] | ParameterName[][]): ParameterName[][] =>
  Array.isArray(params[0]) ? (params as ParameterName[][]) : ([params] as ParameterName[][]);

export const PropertyBasicParameters = ({ form, typeDefinition, fieldPathPrefix = '' }: Props) => {
  if (!typeDefinition || !typeDefinition.basicParameters) {
    return null;
  }

  const rows = parametersToRows(typeDefinition.basicParameters);

  const getMaxWidth = (rowIndex: number, totalItems: number) => {
    if (rowIndex === 0 || totalItems >= 3) {
      return 'initial';
    }
    return totalItems <= 1 ? '300px' : '600px';
  };

  return (
    <Fragment>
      {rows.map((parameters, i) => (
        <div key={i}>
          <EuiFlexGroup style={{ maxWidth: getMaxWidth(i, parameters.length) }}>
            {parameters.map(parameter => (
              <EuiFlexItem key={parameter} grow={i !== 0}>
                <UseField
                  form={form}
                  path={fieldPathPrefix + parameter}
                  config={
                    parametersDefinition[parameter] && parametersDefinition[parameter].fieldConfig
                  }
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
