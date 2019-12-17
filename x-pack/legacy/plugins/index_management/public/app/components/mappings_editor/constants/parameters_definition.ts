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
import { INDEX_DEFAULT, TYPE_DEFINITION } from '../constants';
import { AliasOption, DataType, ComboBoxOption } from '../types';

const { toInt } = fieldFormatters;
const { emptyField, containsCharsField } = fieldValidators;

const commonErrorMessages = {
  smallerThanZero: i18n.translate(
    'xpack.idxMgmt.mappingsEditor.parameters.validations.smallerZeroErrorMessage',
    {
      defaultMessage: 'The value must be greater or equal to 0.',
    }
  ),
  spacesNotAllowed: i18n.translate(
    'xpack.idxMgmt.mappingsEditor.parameters.validations.spacesNotAllowedErrorMessage',
    {
      defaultMessage: 'Spaces are not allowed.',
    }
  ),
  analyzerIsRequired: i18n.translate(
    'xpack.idxMgmt.mappingsEditor.parameters.validations.analyzerIsRequiredErrorMessage',
    {
      defaultMessage: 'Give a name to the analyzer.',
    }
  ),
};

const nullValueLabel = i18n.translate('xpack.idxMgmt.mappingsEditor.nullValueFieldLabel', {
  defaultMessage: 'Null value',
});

const nullValueValidateEmptyField = emptyField(
  i18n.translate(
    'xpack.idxMgmt.mappingsEditor.parameters.validations.nullValueIsRequiredErrorMessage',
    {
      defaultMessage: 'Null value is required.',
    }
  )
);

const mapIndexToValue = ['true', true, 'false', false];

const indexOptionsConfig = {
  label: i18n.translate('xpack.idxMgmt.mappingsEditor.indexOptionsLabel', {
    defaultMessage: 'Index options',
  }),
  type: FIELD_TYPES.SUPER_SELECT,
  helpText: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.indexOptionsHelpText', {
    defaultMessage: 'Information to store in the index.',
  }),
};

export const PARAMETERS_DEFINITION = {
  name: {
    fieldConfig: {
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.nameFieldLabel', {
        defaultMessage: 'Field name',
      }),
      defaultValue: '',
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.nameIsRequiredErrorMessage',
              {
                defaultMessage: 'Give a name to the field.',
              }
            )
          ),
        },
        {
          validator: containsCharsField({
            chars: ' ',
            message: commonErrorMessages.spacesNotAllowed,
          }),
        },
        {
          validator: fieldValidators.containsCharsField({
            chars: '.',
            message: i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.nameWithDotErrorMessage',
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
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.typeFieldLabel', {
        defaultMessage: 'Field type',
      }),
      defaultValue: 'text',
      deserializer: (fieldType: DataType | undefined) => {
        if (typeof fieldType === 'string' && Boolean(fieldType)) {
          return [
            {
              label: TYPE_DEFINITION[fieldType] ? TYPE_DEFINITION[fieldType].label : fieldType,
              value: fieldType,
            },
          ];
        }
        return [];
      },
      serializer: (fieldType: ComboBoxOption[] | undefined) =>
        fieldType && fieldType.length ? fieldType[0].value : fieldType,
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.typeIsRequiredErrorMessage',
              {
                defaultMessage: 'Specify a field type.',
              }
            )
          ),
        },
      ],
    },
  },
  store: {
    fieldConfig: {
      type: FIELD_TYPES.CHECKBOX,
      defaultValue: false,
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
  doc_values_binary: {
    fieldConfig: {
      defaultValue: false,
    },
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
  coerce_geo_shape: {
    fieldConfig: {
      defaultValue: false,
    },
  },
  coerce_shape: {
    fieldConfig: {
      defaultValue: false,
    },
  },
  ignore_malformed: {
    fieldConfig: {
      defaultValue: false,
    },
  },
  null_value: {
    fieldConfig: {
      defaultValue: '',
      type: FIELD_TYPES.TEXT,
      label: nullValueLabel,
      validations: [
        {
          validator: nullValueValidateEmptyField,
        },
      ],
    },
  },
  null_value_numeric: {
    fieldConfig: {
      defaultValue: '', // Needed for FieldParams typing
      label: nullValueLabel,
      formatters: [toInt],
      validations: [
        {
          validator: nullValueValidateEmptyField,
        },
      ],
    },
  },
  null_value_boolean: {
    fieldConfig: {
      defaultValue: false,
      label: nullValueLabel,
      deserializer: (value: string | boolean) => mapIndexToValue.indexOf(value),
      serializer: (value: number) => mapIndexToValue[value],
    },
  },
  null_value_geo_point: {
    fieldConfig: {
      defaultValue: '', // Needed for FieldParams typing
      label: nullValueLabel,
      validations: [
        {
          validator: nullValueValidateEmptyField,
        },
      ],
      deserializer: (value: any) => {
        if (value === '') {
          return value;
        }
        return JSON.stringify(value);
      },
      serializer: (value: string) => {
        try {
          return JSON.parse(value);
        } catch (error) {
          // swallow error and return non-parsed value;
          return value;
        }
      },
    },
  },
  copy_to: {
    fieldConfig: {
      defaultValue: '',
      type: FIELD_TYPES.TEXT,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.copyToLabel', {
        defaultMessage: 'Destination field name',
      }),
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.copyToIsRequiredErrorMessage',
              {
                defaultMessage: 'Copy to is required.',
              }
            )
          ),
        },
      ],
    },
  },
  max_input_length: {
    fieldConfig: {
      defaultValue: 50,
      type: FIELD_TYPES.NUMBER,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.maxInputLengthLabel', {
        defaultMessage: 'Max input length',
      }),
      formatters: [toInt],
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.maxInputLengthFieldRequiredErrorMessage',
              {
                defaultMessage: 'Specify a max input length.',
              }
            )
          ),
        },
      ],
    },
  },
  locale: {
    fieldConfig: {
      defaultValue: 'ROOT',
      type: FIELD_TYPES.TEXT,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.localeLabel', {
        defaultMessage: 'Locale',
      }),
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.localeFieldRequiredErrorMessage',
              {
                defaultMessage: 'Specify a locale.',
              }
            )
          ),
        },
      ],
    },
  },
  orientation: {
    fieldConfig: {
      defaultValue: 'ccw',
      type: FIELD_TYPES.SUPER_SELECT,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.orientationLabel', {
        defaultMessage: 'Orientation',
      }),
    },
  },
  boost: {
    fieldConfig: {
      defaultValue: 1.0,
      type: FIELD_TYPES.NUMBER,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.boostLabel', {
        defaultMessage: 'Boost level',
      }),
      formatters: [toInt],
      validations: [
        {
          validator: ({ value }: ValidationFuncArg<any, number>) => {
            if (value < 0) {
              return { message: commonErrorMessages.smallerThanZero };
            }
          },
        },
      ],
    } as FieldConfig,
  },
  scaling_factor: {
    title: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.scalingFactorFieldTitle', {
      defaultMessage: 'Scaling factor',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.parameters.scalingFactorFieldDescription',
      {
        defaultMessage:
          'Values will be multiplied by this factor at index time and rounded to the closest long value. High factor values improve accuracy, but also increase space requirements.',
      }
    ),
    fieldConfig: {
      defaultValue: '',
      type: FIELD_TYPES.NUMBER,
      formatters: [toInt],
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.scalingFactorLabel', {
        defaultMessage: 'Scaling factor',
      }),
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.scalingFactorIsRequiredErrorMessage',
              {
                defaultMessage: 'A scaling factor is required.',
              }
            )
          ),
        },
        {
          validator: ({ value }: ValidationFuncArg<any, number>) => {
            if (value <= 0) {
              return {
                message: i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.parameters.validations.greaterThanZeroErrorMessage',
                  {
                    defaultMessage: 'The scaling factor must be greater than 0.',
                  }
                ),
              };
            }
          },
        },
      ],
      helpText: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.scalingFactorHelpText', {
        defaultMessage: 'Value must be greater than 0.',
      }),
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
          validator: emptyField(commonErrorMessages.analyzerIsRequired),
        },
        {
          validator: containsCharsField({
            chars: ' ',
            message: commonErrorMessages.spacesNotAllowed,
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
          validator: emptyField(commonErrorMessages.analyzerIsRequired),
        },
        {
          validator: containsCharsField({
            chars: ' ',
            message: commonErrorMessages.spacesNotAllowed,
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
          validator: emptyField(commonErrorMessages.analyzerIsRequired),
        },
        {
          validator: containsCharsField({
            chars: ' ',
            message: commonErrorMessages.spacesNotAllowed,
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
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.normalizerIsRequiredErrorMessage',
              {
                defaultMessage: 'Normalizer name is required.',
              }
            )
          ),
        },
        {
          validator: containsCharsField({
            chars: ' ',
            message: commonErrorMessages.spacesNotAllowed,
          }),
        },
      ],
      helpText: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.normalizerHelpText', {
        defaultMessage: 'The name of the normalizer defined in your index settings.',
      }),
    },
  },
  index_options: {
    fieldConfig: {
      ...indexOptionsConfig,
      defaultValue: 'positions',
    },
  },
  index_options_keyword: {
    fieldConfig: {
      ...indexOptionsConfig,
      defaultValue: 'docs',
    },
  },
  index_options_flattened: {
    fieldConfig: {
      ...indexOptionsConfig,
      defaultValue: 'docs',
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
  points_only: {
    fieldConfig: {
      defaultValue: true,
    },
  },
  norms: {
    fieldConfig: {
      defaultValue: true,
    },
  },
  norms_keyword: {
    fieldConfig: {
      defaultValue: false,
    },
  },
  term_vector: {
    fieldConfig: {
      type: FIELD_TYPES.SUPER_SELECT,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.termVectorLabel', {
        defaultMessage: 'Set term vector',
      }),
      defaultValue: 'no',
    },
  },
  path: {
    fieldConfig: {
      type: FIELD_TYPES.COMBO_BOX,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.pathLabel', {
        defaultMessage: 'Field path',
      }),
      helpText: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.pathHelpText', {
        defaultMessage: 'The absolute path from the root to the target field.',
      }),
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.pathIsRequiredErrorMessage',
              {
                defaultMessage: 'Select a field to point the alias to.',
              }
            )
          ),
        },
      ],
      serializer: (value: AliasOption[]) => (value.length === 0 ? '' : value[0].id),
    } as FieldConfig<any, string>,
    targetTypesNotAllowed: ['object', 'nested', 'alias'] as DataType[],
  },
  position_increment_gap: {
    fieldConfig: {
      type: FIELD_TYPES.NUMBER,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.positionIncrementGapLabel', {
        defaultMessage: 'Position increment gap',
      }),
      defaultValue: 100,
      formatters: [toInt],
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.positionIncrementGapIsRequiredErrorMessage',
              {
                defaultMessage: 'Set a position increment gap value',
              }
            )
          ),
        },
        {
          validator: (({ value }: ValidationFuncArg<any, number>) => {
            if (value < 0) {
              return { message: commonErrorMessages.smallerThanZero };
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
      type: FIELD_TYPES.SUPER_SELECT,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.similarityLabel', {
        defaultMessage: 'Similarity algorithm',
      }),
    },
  },
  split_queries_on_whitespace: {
    fieldConfig: {
      defaultValue: false,
    },
  },
  ignore_above: {
    fieldConfig: {
      // Protects against Lucene’s term byte-length limit of 32766. UTF-8 characters may occupy at
      // most 4 bytes, so 32766 / 4 = 8191 characters.
      defaultValue: 8191,
      type: FIELD_TYPES.NUMBER,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.ignoreAboveFieldLabel', {
        defaultMessage: 'Character length limit',
      }),
      formatters: [toInt],
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.ignoreAboveIsRequiredErrorMessage',
              {
                defaultMessage: 'Character length limit is required.',
              }
            )
          ),
        },
        {
          validator: (({ value }: ValidationFuncArg<any, number>) => {
            if ((value as number) < 0) {
              return { message: commonErrorMessages.smallerThanZero };
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
  depth_limit: {
    fieldConfig: {
      defaultValue: 20,
      type: FIELD_TYPES.NUMBER,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.depthLimitFieldLabel', {
        defaultMessage: 'Nested object depth limit',
      }),
      formatters: [toInt],
      validations: [
        {
          validator: (({ value }: ValidationFuncArg<any, number>) => {
            if ((value as number) < 0) {
              return { message: commonErrorMessages.smallerThanZero };
            }
          }) as ValidationFunc,
        },
      ],
    },
  },
  dims: {
    fieldConfig: {
      defaultValue: '',
      type: FIELD_TYPES.NUMBER,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.dimsFieldLabel', {
        defaultMessage: 'Dimensions',
      }),
      helpText: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.dimsHelpTextDescription', {
        defaultMessage: 'The number of dimensions in the vector.',
      }),
      formatters: [toInt],
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.dimsIsRequiredErrorMessage',
              {
                defaultMessage: 'Specify a dimension.',
              }
            )
          ),
        },
      ],
    },
  },
};
