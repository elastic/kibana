/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Field } from '../../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/components';
import { Field as FieldType } from '../../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/hook_form_lib';
import { ParameterName } from '../../config';
import { Name } from './name';

type FieldComponent = ({ field }: { field: FieldType }) => JSX.Element;

const parameterMapToComponent: { [key in ParameterName]?: FieldComponent } = {
  name: Name,
};

export const getComponentForParameter = (parameter: ParameterName): FieldComponent =>
  parameterMapToComponent[parameter] || Field;
