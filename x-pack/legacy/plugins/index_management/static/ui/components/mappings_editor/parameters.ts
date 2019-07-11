/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FIELD_TYPES,
  FieldConfig,
} from '../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/hook_form_lib';
import {
  emptyField,
  containsCharsField,
} from '../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/field_validators';

export type ParameterName =
  | 'name'
  | 'type'
  | 'store'
  | 'index'
  | 'doc_values'
  | 'coerce'
  | 'ignore_malformed'
  | 'null_value'
  | 'boost';

export interface Parameter {
  fieldConfig: FieldConfig;
  docs?: string;
}

export const parameters: { [key in ParameterName]: Parameter } = {
  name: {
    fieldConfig: {
      label: 'Name',
      validations: [
        {
          validator: emptyField,
          message: 'Please give a name to the property',
        },
        {
          validator: containsCharsField(' '),
          message: 'Spaces are not allowed in the name.',
        },
      ],
    },
  },
  type: {
    fieldConfig: {
      label: 'Type',
      defaultValue: 'text',
      type: FIELD_TYPES.SELECT,
    },
  },
  store: {
    fieldConfig: {
      label: 'Store',
      type: FIELD_TYPES.TOGGLE,
      defaultValue: true,
    },
    docs: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-store.html',
  },
  index: {
    fieldConfig: {
      label: 'Index',
      type: FIELD_TYPES.TOGGLE,
      defaultValue: true,
    },
  },
  doc_values: {
    fieldConfig: {
      label: 'Doc values',
      type: FIELD_TYPES.TOGGLE,
      defaultValue: true,
    },
    docs: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/doc-values.html',
  },
  coerce: {
    fieldConfig: {
      label: 'Coerce',
      type: FIELD_TYPES.TOGGLE,
      defaultValue: true,
    },
  },
  ignore_malformed: {
    fieldConfig: {
      label: 'Ignore malformed',
      type: FIELD_TYPES.TOGGLE,
      defaultValue: true,
    },
  },
  null_value: {
    fieldConfig: {
      label: 'Null value',
      type: FIELD_TYPES.TEXT,
    },
  },
  boost: {
    fieldConfig: {
      label: 'Boost',
      type: FIELD_TYPES.TEXT,
    },
  },
};
