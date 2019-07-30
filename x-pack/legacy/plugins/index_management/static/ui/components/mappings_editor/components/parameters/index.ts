/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ComponentType } from 'react';

import { Field } from '../../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/components';
import { Field as FieldType } from '../../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/hook_form_lib';
import { ParameterName } from '../../config';

import { Name } from './name';

type Comp = ({ field }: { field: FieldType } & any) => JSX.Element;

const parameterMapToComponent: { [key in ParameterName]?: Comp } = {
  name: Name,
};

export const getComponentForParameter = (parameter: ParameterName): Comp => {
  return parameterMapToComponent[parameter] || Field;
};
