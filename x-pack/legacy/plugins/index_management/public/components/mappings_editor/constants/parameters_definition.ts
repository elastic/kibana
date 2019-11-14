/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

import { FieldConfig } from 'src/plugins/es_ui_shared/static/forms/hook_form_lib';
import {
  FIELD_TYPES,
  fieldValidators,
  ValidationFunc,
  ValidationFuncArg,
  fieldFormatters,
} from '../shared_imports';
import { INDEX_DEFAULT } from '../constants';

import { ComboBoxOption } from '../types';
import { ALL_DATE_FORMAT_OPTIONS } from './field_options';

const { toInt } = fieldFormatters;
const { emptyField, containsCharsField } = fieldValidators;

export const PARAMETERS_DEFINITION = {
  name: {
    fieldConfig: {
      label: 'Field name',
      defaultValue: '',
      validations: [
        {
          validator: emptyField(
            i18n.translate('xpack.idxMgmt.mappingsEditor.fieldNameFieldRequiredErrorMessage', {
              defaultMessage: 'Give a name to the field.',
            })
          ),
        },
        {
          validator: containsCharsField({
            chars: ' ',
            message: i18n.translate(
              'xpack.idxMgmt.mappingsEditor.fieldNameFieldSpacesValidationErrorMessage',
              {
                defaultMessage: 'Spaces are not allowed in the name.',
              }
            ),
          }),
        },
        {
          validator: fieldValidators.containsCharsField({
            chars: '.',
            message: i18n.translate(
              'xpack.idxMgmt.mappingsEditor.fieldNameFieldDotValidationErrorMessage',
              {
                defaultMessage: 'Cannot contain a dot (.).',
              }
            ),
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
          label: i18n.translate('xpack.idxMgmt.mappingsEditor.minSegmentSizeFieldLabel', {
            defaultMessage: 'Minimum segment size',
          }),
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
          validator: emptyField(
            i18n.translate('xpack.idxMgmt.mappingsEditor.nullValueFieldRequiredErrorMessage', {
              defaultMessage: 'Specify a null value.',
            })
          ),
        },
      ],
    },
  },
  max_input_length: {
    fieldConfig: {
      defaultValue: 50,
      type: FIELD_TYPES.NUMBER,
      validations: [
        {
          validator: emptyField(
            i18n.translate('xpack.idxMgmt.mappingsEditor.maxInputLengthFieldRequiredErrorMessage', {
              defaultMessage: 'Specify a max input length.',
            })
          ),
        },
      ],
    },
  },
  locale: {
    fieldConfig: {
      defaultValue: 'ROOT',
      type: FIELD_TYPES.TEXT,
      validations: [
        {
          validator: emptyField(
            i18n.translate('xpack.idxMgmt.mappingsEditor.localeFieldRequiredErrorMessage', {
              defaultMessage: 'Specify a locale.',
            })
          ),
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
                message: i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.boostFieldValidationErrorMessage',
                  {
                    defaultMessage: 'The value must be greater or equal to 0.',
                  }
                ),
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
                message: i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.scalingFactorFieldValidationErrorMessage',
                  {
                    defaultMessage: 'The value must be greater or equal to 0.',
                  }
                ),
              };
            }
          },
        },
      ],
    } as FieldConfig,
  },
  dynamic: {
    fieldConfig: {
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.dynamicFieldLabel', {
        defaultMessage: 'Dynamic',
      }),
      type: FIELD_TYPES.CHECKBOX,
      defaultValue: true,
    },
  },
  enabled: {
    fieldConfig: {
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.enabledFieldLabel', {
        defaultMessage: 'Enabled',
      }),
      type: FIELD_TYPES.CHECKBOX,
      defaultValue: true,
    },
  },
  format: {
    fieldConfig: {
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.formatFieldLabel', {
        defaultMessage: 'Format',
      }),
      defaultValue: 'strict_date_optional_time||epoch_millis',
      serializer: (format: ComboBoxOption[]): string | undefined =>
        format.length ? format.map(({ label }) => label).join('||') : undefined,
      deserializer: (formats: string): ComboBoxOption[] | undefined =>
        formats.split('||').map(format => ({ label: format })),
    },
  },
  analyzer: {
    fieldConfig: {
      label: 'Analyzer',
      defaultValue: INDEX_DEFAULT,
      validations: [
        {
          validator: emptyField(
            i18n.translate('xpack.idxMgmt.mappingsEditor.analyzerFieldRequiredErrorMessage', {
              defaultMessage: 'Give a name to the analyzer.',
            })
          ),
        },
        {
          validator: containsCharsField({
            chars: ' ',
            message: i18n.translate(
              'xpack.idxMgmt.mappingsEditor.analyzerFieldValidationErrorMessage',
              {
                defaultMessage: 'Spaces are not allowed.',
              }
            ),
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
          validator: emptyField(
            i18n.translate('xpack.idxMgmt.mappingsEditor.searchAnalyzerFieldRequiredErrorMessage', {
              defaultMessage: 'Give a name to the analyzer.',
            })
          ),
        },
        {
          validator: containsCharsField({
            chars: ' ',
            message: i18n.translate(
              'xpack.idxMgmt.mappingsEditor.searchAnalyzerFieldValidationErrorMessage',
              {
                defaultMessage: 'Spaces are not allowed.',
              }
            ),
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
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.searchQuoteAnalyzerFieldRequiredErrorMessage',
              {
                defaultMessage: 'Give a name to the analyzer.',
              }
            )
          ),
        },
        {
          validator: containsCharsField({
            chars: ' ',
            message: i18n.translate(
              'xpack.idxMgmt.mappingsEditor.searchQuoteAnalyzerFieldValidationErrorMessage',
              {
                defaultMessage: 'Spaces are not allowed.',
              }
            ),
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
          validator: emptyField(
            i18n.translate('xpack.idxMgmt.mappingsEditor.normalizerFieldRequiredErrorMessage', {
              defaultMessage: 'Give a name to the normalizer.',
            })
          ),
        },
        {
          validator: containsCharsField({
            chars: ' ',
            message: i18n.translate(
              'xpack.idxMgmt.mappingsEditor.normalizerFieldValidationErrorMessage',
              {
                defaultMessage: 'Spaces are not allowed.',
              }
            ),
          }),
        },
      ],
    },
  },
  index_options: {
    fieldConfig: {
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.indexOptionsLabel', {
        defaultMessage: 'Index options',
      }),
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
  preserve_separators: {
    fieldConfig: {
      defaultValue: true,
    },
  },
  preserve_position_increments: {
    fieldConfig: {
      defaultValue: true,
    },
  },
  ignore_z_value: {
    fieldConfig: {
      defaultValue: true,
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
  position_increment_gap: {
    fieldConfig: {
      type: FIELD_TYPES.NUMBER,
      defaultValue: 100,
      formatters: [toInt],
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.positionIncrementGapFieldRequiredErrorMessage',
              {
                defaultMessage: 'Set a position increment gap value',
              }
            )
          ),
        },
        {
          validator: (({ value }: ValidationFuncArg<any, number>) => {
            if (value < 0) {
              return {
                message: i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.positionIncrementGapFieldValidationErrorMessage',
                  {
                    defaultMessage: 'The value must be greater or equal to 0.',
                  }
                ),
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
                message: i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.ignoreAboveFieldErrorMessage',
                  {
                    defaultMessage: 'The value must be greater or equal to 0.',
                  }
                ),
              };
            }
          }) as ValidationFunc,
        },
      ],
    },
  },
  enable_position_increments: {
    fieldConfig: {
      defaultValue: true,
    },
  },
};
