/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FieldConfig,
  FIELD_TYPES,
} from '../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/hook_form_lib';

import {
  emptyField,
  containsCharsField,
} from '../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/lib/field_validators';

import { ERROR_CODES } from '../constants';

export type ParameterName =
  | 'name'
  | 'type'
  | 'store'
  | 'index'
  | 'fielddata'
  | 'doc_values'
  | 'coerce'
  | 'ignore_malformed'
  | 'null_value'
  | 'dynamic'
  | 'enabled'
  | 'boost'
  | 'locale'
  | 'format';

export interface Parameter {
  fieldConfig?: FieldConfig;
  paramName?: string;
  docs?: string;
}

export const parametersDefinition: { [key in ParameterName]: Parameter } = {
  name: {
    fieldConfig: {
      label: 'Field name',
      defaultValue: '',
      validations: [
        {
          validator: emptyField('Give a name to the field.'),
        },
        {
          validator: containsCharsField({
            chars: ' ',
            message: 'Spaces are not allowed in the name.',
          }),
        },
        {
          validator: ({ path, value, formData }) => {
            const regEx = /(.+)(\d+\.name)$/;
            const regExResult = regEx.exec(path);

            if (regExResult) {
              const { 1: parentPath } = regExResult;
              // Get all the "name" properties on the parent path
              const namePropertyPaths = Object.keys(formData).filter(
                key => key !== path && key.startsWith(parentPath) && key.endsWith('name')
              );

              for (const namePath of namePropertyPaths) {
                if (formData[namePath] === value) {
                  return {
                    code: ERROR_CODES.NAME_CONFLICT,
                    message: 'A field with the same name already exists.',
                  };
                }
              }
            }
          },
        },
      ],
    },
  },
  type: {
    fieldConfig: {
      label: 'Field type',
      defaultValue: 'text',
      type: FIELD_TYPES.SELECT,
    },
  },
  store: {
    fieldConfig: {
      label: 'Store',
      type: FIELD_TYPES.CHECKBOX,
      defaultValue: true,
    },
    docs: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-store.html',
  },
  index: {
    fieldConfig: {
      label: 'Index',
      type: FIELD_TYPES.CHECKBOX,
      defaultValue: true,
    },
  },
  doc_values: {
    fieldConfig: {
      label: 'Doc values',
      type: FIELD_TYPES.CHECKBOX,
      defaultValue: true,
    },
    docs: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/doc-values.html',
  },
  fielddata: {
    fieldConfig: {
      label: 'Fielddata',
      type: FIELD_TYPES.CHECKBOX,
      defaultValue: true,
    },
    docs: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/doc-values.html',
  },
  coerce: {
    fieldConfig: {
      label: 'Coerce',
      type: FIELD_TYPES.CHECKBOX,
      defaultValue: true,
    },
  },
  ignore_malformed: {
    fieldConfig: {
      label: 'Ignore malformed',
      type: FIELD_TYPES.CHECKBOX,
      defaultValue: true,
    },
  },
  null_value: {
    fieldConfig: {
      label: 'Null value',
      defaultValue: '',
      type: FIELD_TYPES.TEXT,
    },
  },
  boost: {
    fieldConfig: {
      label: 'Boost',
      defaultValue: '',
      type: FIELD_TYPES.TEXT,
    },
  },
  dynamic: {
    fieldConfig: {
      label: 'Dynamic',
      type: FIELD_TYPES.CHECKBOX,
      defaultValue: true,
    },
  },
  enabled: {
    fieldConfig: {
      label: 'Enabled',
      type: FIELD_TYPES.CHECKBOX,
      defaultValue: true,
    },
  },
  locale: {
    fieldConfig: {
      label: 'Locale',
      defaultValue: '',
    },
  },
  format: {
    fieldConfig: {
      label: 'Formats',
      type: FIELD_TYPES.COMBO_BOX,
      defaultValue: [],
      serializer: (options: any[]): string | undefined =>
        options.length ? options.join('||') : undefined,
      deSerializer: (formats?: string | any[]): any[] =>
        Array.isArray(formats) ? formats : (formats as string).split('||'),
    },
  },
};
