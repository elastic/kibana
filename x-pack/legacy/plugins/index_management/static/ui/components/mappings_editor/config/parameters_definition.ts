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

import { toInt } from '../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/lib';

import { nameConflictError } from '../errors';
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
  | 'format'
  | 'analyzer'
  | 'search_analyzer'
  | 'search_quote_analyzer'
  | 'index_options'
  | 'eager_global_ordinals'
  | 'index_prefixes'
  | 'index_phrases'
  | 'norms'
  | 'term_vector'
  | 'position_increment_gap'
  | 'similarity'
  | 'normalizer'
  | 'ignore_above'
  | 'split_queries_on_whitespace';

export interface Parameter {
  fieldConfig?: FieldConfig | Record<string, FieldConfig>;
  paramName?: string;
  docs?: string;
}

export const parametersDefinition: {
  [key in ParameterName]: Parameter;
} = {
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
          validator: ({ path, value, form, formData }) => {
            const regEx = /(.+)(\d+\.name)$/;
            const regExResult = regEx.exec(path);

            if (regExResult) {
              const { 1: parentPath } = regExResult;
              // Get all the "name" properties on the parent path
              const namePropertyPaths = Object.keys(formData).filter(key => {
                // Make sure we are filtering *only* the properties at the
                // same nested object level
                const isSameNestedLevel = Math.abs(key.length - path.length) <= 3;

                return (
                  key !== path &&
                  isSameNestedLevel &&
                  key.startsWith(parentPath) &&
                  key.endsWith('name')
                );
              });

              // Keep a referende of all the field name that have
              // a conflict with the current field.
              const conflictPaths: string[] = [];

              for (const namePath of namePropertyPaths) {
                const nameField = form.getFields()[namePath];
                const nameFieldConflictError = nameField.errors.filter(
                  err => err.code === ERROR_CODES.NAME_CONFLICT
                )[0];

                let error;
                if (formData[namePath] === value) {
                  conflictPaths.push(namePath);
                  if (!nameFieldConflictError) {
                    error = nameConflictError([path]);
                  } else {
                    error = nameConflictError([...nameFieldConflictError.conflictPaths, path]);
                  }
                } else if (
                  nameFieldConflictError &&
                  (nameFieldConflictError.conflictPaths as string[]).some(
                    conflictPath => conflictPath === path
                  )
                ) {
                  if ((nameFieldConflictError.conflictPaths as string[]).length > 1) {
                    const updatedConflictPaths = (nameFieldConflictError.conflictPaths as string[]).filter(
                      p => p !== path
                    );
                    error = nameConflictError(updatedConflictPaths);
                  } else {
                    nameField.setErrors([]);
                  }
                }

                if (error) {
                  // Update the validation on the other field
                  nameField.setErrors([error]);
                }
              }

              if (conflictPaths.length) {
                // Update the validation on the current field being validated
                return nameConflictError(conflictPaths);
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
      defaultValue: false,
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
      defaultValue: 1.0,
      type: FIELD_TYPES.NUMBER,
      formatters: [toInt],
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
  analyzer: {
    fieldConfig: {
      label: 'Analyzer',
      defaultValue: 'index_default',
      type: FIELD_TYPES.SELECT,
    },
  },
  search_analyzer: {
    fieldConfig: {
      label: 'Search analyzer',
      defaultValue: 'index_default',
      type: FIELD_TYPES.SELECT,
    },
  },
  search_quote_analyzer: {
    fieldConfig: {
      label: 'Search quote analyzer',
      defaultValue: 'index_default',
      type: FIELD_TYPES.SELECT,
    },
  },
  normalizer: {
    fieldConfig: {
      label: 'Normalizer',
      defaultValue: '',
      type: FIELD_TYPES.TEXT,
      validations: [
        {
          validator: containsCharsField({
            chars: ' ',
            message: 'Spaces are not allowed.',
          }),
        },
      ],
    },
  },
  index_options: {
    fieldConfig: {
      label: 'Index options',
      defaultValue: 'docs',
      type: FIELD_TYPES.SELECT,
    },
  },
  eager_global_ordinals: {
    fieldConfig: {
      label: 'Eager global ordinals',
      type: FIELD_TYPES.CHECKBOX,
      defaultValue: false,
    },
  },
  index_phrases: {
    fieldConfig: {
      label: 'Index phrases',
      type: FIELD_TYPES.CHECKBOX,
      defaultValue: false,
    },
  },
  norms: {
    fieldConfig: {
      label: 'Norms',
      type: FIELD_TYPES.CHECKBOX,
      defaultValue: true,
    },
  },
  term_vector: {
    fieldConfig: {
      label: 'Term vectors',
      type: FIELD_TYPES.CHECKBOX,
      defaultValue: false,
    },
  },
  position_increment_gap: {
    fieldConfig: {
      label: 'Position increment gap',
      type: FIELD_TYPES.NUMBER,
      defaultValue: 100,
      formatters: [toInt],
      validations: [
        {
          validator: emptyField('Set a position increment gap value.'),
        },
        {
          validator: ({ value }) => {
            if ((value as number) < 0) {
              return {
                message: 'The value must be greater or equal to 0.',
              };
            }
          },
        },
      ],
    },
  },
  index_prefixes: {
    fieldConfig: {
      min_chars: {
        type: FIELD_TYPES.NUMBER,
        defaultValue: 2,
        helpText: 'Min chars.',
        formatters: [toInt],
        validations: [
          {
            validator: emptyField('Set a min value.'),
          },
          {
            validator: ({ value }) => {
              if ((value as number) < 0) {
                return {
                  message: 'The value must be greater or equal than zero.',
                };
              }
            },
          },
          {
            validator: ({ value, path, formData }) => {
              const maxPath = path.replace('.min', '.max');
              const maxValue = formData[maxPath];

              if ((maxValue as string) === '') {
                return;
              }

              if ((value as number) >= (maxValue as number)) {
                return {
                  message: 'The value must be smaller than the max value.',
                };
              }
            },
          },
        ],
      },
      max_chars: {
        type: FIELD_TYPES.NUMBER,
        defaultValue: 5,
        helpText: 'Max chars.',
        formatters: [toInt],
        validations: [
          {
            validator: emptyField('Set a max value.'),
          },
          {
            validator: ({ value }) => {
              if ((value as number) > 20) {
                return {
                  message: 'The value must be smaller or equal than 20.',
                };
              }
            },
          },
          {
            validator: ({ value, path, formData }) => {
              const minPath = path.replace('.max', '.min');
              const minValue = formData[minPath];

              if ((minValue as string) === '') {
                return;
              }

              if ((value as number) <= (minValue as number)) {
                return {
                  message: 'The value must be greater than the min value.',
                };
              }
            },
          },
        ],
      },
    },
  },
  similarity: {
    fieldConfig: {
      label: 'Similarity algorithm',
      defaultValue: 'BM25',
      type: FIELD_TYPES.SELECT,
    },
  },
  split_queries_on_whitespace: {
    fieldConfig: {
      label: 'Split queries on whitespace',
      type: FIELD_TYPES.CHECKBOX,
      defaultValue: false,
    },
  },
  ignore_above: {
    fieldConfig: {
      label: 'Ignore above',
      defaultValue: 2147483647,
      type: FIELD_TYPES.NUMBER,
      formatters: [toInt],
    },
  },
};
