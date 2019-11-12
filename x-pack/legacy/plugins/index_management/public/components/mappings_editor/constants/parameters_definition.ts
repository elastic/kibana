/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FieldConfig } from 'src/plugins/es_ui_shared/static/forms/hook_form_lib';
import {
  FIELD_TYPES,
  fieldValidators,
  ValidationFunc,
  ValidationFuncArg,
  fieldFormatters,
} from '../shared_imports';
import { INDEX_DEFAULT } from '../constants';
import { AliasOption } from '../types';

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
  fielddata_frequency_filter: {
    fieldConfig: { defaultValue: {} }, // Needed for FieldParams typing
    props: {
      min: {
        fieldConfig: {
          defaultValue: 0.01,
          serializer: value => (value === '' ? '' : toInt(value) / 100),
          deserializer: value => Math.round(value * 100),
        } as FieldConfig,
      },
      max: {
        fieldConfig: {
          defaultValue: 1,
          serializer: value => (value === '' ? '' : toInt(value) / 100),
          deserializer: value => Math.round(value * 100),
        } as FieldConfig,
      },
      min_segment_size: {
        fieldConfig: {
          type: FIELD_TYPES.NUMBER,
          label: 'Minimum segment size:',
          defaultValue: 50,
          formatters: [toInt],
        },
      },
    },
  },
  coerce: {
    fieldConfig: {
      defaultValue: true,
    },
  },
  ignore_malformed: {
    fieldConfig: {
      defaultValue: true,
    },
  },
  null_value: {
    fieldConfig: {
      defaultValue: '',
      type: FIELD_TYPES.TEXT,
      validations: [
        {
          validator: emptyField('Specify a null value.'),
        },
      ],
    },
  },
  boost: {
    fieldConfig: {
      defaultValue: 1.0,
      type: FIELD_TYPES.NUMBER,
      formatters: [toInt],
      validations: [
        {
          validator: ({ value }: ValidationFuncArg<any, number>) => {
            if (value < 0) {
              return {
                message: 'The value must be greater or equal than 0.',
              };
            }
          },
        },
      ],
    } as FieldConfig,
  },
  scaling_factor: {
    fieldConfig: {
      defaultValue: 1.0,
      type: FIELD_TYPES.NUMBER,
      formatters: [toInt],
      validations: [
        {
          validator: ({ value }: ValidationFuncArg<any, number>) => {
            if (value < 0) {
              return {
                message: 'The value must be greater or equal than 0.',
              };
            }
          },
        },
      ],
    } as FieldConfig,
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
      validations: [
        {
          validator: emptyField('Give a name to the analyzer'),
        },
        {
          validator: containsCharsField({
            chars: ' ',
            message: 'Spaces are not allowed in the analyzer.',
          }),
        },
      ],
    },
  },
  search_analyzer: {
    fieldConfig: {
      label: 'Search analyzer',
      defaultValue: INDEX_DEFAULT,
      validations: [
        {
          validator: emptyField('Give a name to the analyzer'),
        },
        {
          validator: containsCharsField({
            chars: ' ',
            message: 'Spaces are not allowed in the analyzer.',
          }),
        },
      ],
    },
  },
  search_quote_analyzer: {
    fieldConfig: {
      label: 'Search quote analyzer',
      defaultValue: INDEX_DEFAULT,
      validations: [
        {
          validator: emptyField('Give a name to the analyzer.'),
        },
        {
          validator: containsCharsField({
            chars: ' ',
            message: 'Spaces are not allowed in the analyzer.',
          }),
        },
      ],
    },
  },
  normalizer: {
    fieldConfig: {
      label: 'Normalizer',
      defaultValue: '',
      type: FIELD_TYPES.TEXT,
      validations: [
        {
          validator: emptyField('Give a name to the normalizer.'),
        },
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
      defaultValue: false,
    },
  },
  index_phrases: {
    fieldConfig: {
      defaultValue: false,
    },
  },
  norms: {
    fieldConfig: {
      defaultValue: false,
    },
  },
  term_vector: {
    fieldConfig: {
      type: FIELD_TYPES.SELECT,
      defaultValue: 'no',
    },
  },
  path: {
    fieldConfig: {
      type: FIELD_TYPES.COMBO_BOX,
      label: 'Field path',
      helpText: 'The path of the field you want to point the alias to.',
      validations: [
        {
          validator: emptyField('Select a field to point the alias to.'),
        },
      ],
      serializer: (value: AliasOption[]) => (value.length === 0 ? '' : value[0].id),
    } as FieldConfig<any, string>,
  },
  position_increment_gap: {
    fieldConfig: {
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
    fieldConfig: { defaultValue: {} }, // Needed for FieldParams typing
    props: {
      min_chars: {
        fieldConfig: {
          type: FIELD_TYPES.NUMBER,
          defaultValue: 2,
          serializer: value => (value === '' ? '' : toInt(value)),
        } as FieldConfig,
      },
      max_chars: {
        fieldConfig: {
          type: FIELD_TYPES.NUMBER,
          defaultValue: 5,
          serializer: value => (value === '' ? '' : toInt(value)),
        } as FieldConfig,
      },
    },
  },
  similarity: {
    fieldConfig: {
      defaultValue: 'BM25',
      type: FIELD_TYPES.SELECT,
    },
  },
  split_queries_on_whitespace: {
    fieldConfig: {
      defaultValue: false,
    },
  },
  ignore_above: {
    fieldConfig: {
      defaultValue: 2147483647,
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
