/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  FIELD_TYPES,
  fieldValidators,
  ValidationFunc,
  ValidationFuncArg,
  fieldFormatters,
} from '../shared_imports';
import { INDEX_DEFAULT } from '../constants';

const { toInt } = fieldFormatters;
const { emptyField, containsCharsField } = fieldValidators;

export const PARAMETERS_DEFINITION = {
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
          validator: fieldValidators.containsCharsField({
            chars: '.',
            message: 'Cannot contain a dot (.)',
          }),
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
      type: FIELD_TYPES.CHECKBOX,
      defaultValue: true,
    },
    docs: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-store.html',
  },
  index: {
    fieldConfig: {
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
      validations: [
        {
          validator: (({ value }: ValidationFuncArg<any, number>) => {
            if (value < 0) {
              return {
                message: 'The value must be greater or equal than 0.',
              };
            }
          }) as ValidationFunc,
        },
      ],
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
      defaultValue: INDEX_DEFAULT,
      type: FIELD_TYPES.SELECT,
    },
  },
  search_analyzer: {
    fieldConfig: {
      label: 'Search analyzer',
      defaultValue: INDEX_DEFAULT,
      type: FIELD_TYPES.SELECT,
    },
  },
  search_quote_analyzer: {
    fieldConfig: {
      label: 'Search quote analyzer',
      defaultValue: INDEX_DEFAULT,
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
          validator: (({ value }: ValidationFuncArg<any, number>) => {
            if (value < 0) {
              return {
                message: 'The value must be greater or equal than 0.',
              };
            }
          }) as ValidationFunc,
        },
      ],
    },
  },
  index_prefixes: {
    fieldConfig: { defaultValue: null }, // TODO for now this is required...
    props: {
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
            validator: ({ value }: ValidationFuncArg<any, number>) => {
              if (value < 0) {
                return {
                  message: 'The value must be greater or equal than zero.',
                };
              }
            },
          },
          {
            validator: ({ value, path, formData }: ValidationFuncArg<any, number>) => {
              const maxPath = path.replace('.min', '.max');
              const maxValue: number | string = formData[maxPath];

              if (maxValue === '') {
                return;
              }

              if (value >= maxValue) {
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
            validator: ({ value }: ValidationFuncArg<any, number>) => {
              if (value > 20) {
                return {
                  message: 'The value must be smaller or equal than 20.',
                };
              }
            },
          },
          {
            validator: ({ value, path, formData }: ValidationFuncArg<any, number>) => {
              const minPath = path.replace('.max', '.min');
              const minValue: number | string = formData[minPath];
              if (minValue === '') {
                return;
              }
              if (value <= minValue) {
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
      defaultValue: 256,
      type: FIELD_TYPES.NUMBER,
      formatters: [toInt],
      validations: [
        {
          validator: (({ value }: ValidationFuncArg<any, number>) => {
            if ((value as number) < 0) {
              return {
                message: 'The value must be greater or equal than 0.',
              };
            }
          }) as ValidationFunc,
        },
      ],
    },
  },
};
