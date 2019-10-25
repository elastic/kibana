/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  FormSchema,
  FIELD_TYPES,
  VALIDATION_TYPES,
} from '../../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';

import {
  fieldFormatters,
  fieldValidators,
} from '../../../../../../../../src/plugins/es_ui_shared/static/forms/helpers';

import {
  INVALID_INDEX_PATTERN_CHARS,
  INVALID_TEMPLATE_NAME_CHARS,
} from '../../../../common/constants';

const { emptyField, containsCharsField, startsWithField, indexPatternField } = fieldValidators;
const { toInt } = fieldFormatters;
const indexPatternInvalidCharacters = INVALID_INDEX_PATTERN_CHARS.join(' ');

export const schemas: Record<string, FormSchema> = {
  logistics: {
    name: {
      type: FIELD_TYPES.TEXT,
      label: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.fieldNameLabel', {
        defaultMessage: 'Name',
      }),
      validations: [
        {
          validator: emptyField(
            i18n.translate('xpack.idxMgmt.templateValidation.templateNameRequiredError', {
              defaultMessage: 'A template name is required.',
            })
          ),
        },
        {
          validator: containsCharsField({
            chars: ' ',
            message: i18n.translate('xpack.idxMgmt.templateValidation.templateNameSpacesError', {
              defaultMessage: 'Spaces are not allowed in a template name.',
            }),
          }),
        },
        {
          validator: startsWithField({
            char: '_',
            message: i18n.translate(
              'xpack.idxMgmt.templateValidation.templateNameUnderscoreError',
              {
                defaultMessage: 'A template name must not start with an underscore.',
              }
            ),
          }),
        },
        {
          validator: startsWithField({
            char: '.',
            message: i18n.translate('xpack.idxMgmt.templateValidation.templateNamePeriodError', {
              defaultMessage: 'A template name must not start with a period.',
            }),
          }),
        },
        {
          validator: containsCharsField({
            chars: INVALID_TEMPLATE_NAME_CHARS,
            message: ({ charsFound }) =>
              i18n.translate(
                'xpack.idxMgmt.templateValidation.templateNameInvalidaCharacterError',
                {
                  defaultMessage: 'A template name must not contain the character "{invalidChar}"',
                  values: { invalidChar: charsFound[0] },
                }
              ),
          }),
        },
      ],
    },
    indexPatterns: {
      type: FIELD_TYPES.COMBO_BOX,
      defaultValue: [],
      label: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.fieldIndexPatternsLabel', {
        defaultMessage: 'Index patterns',
      }),
      helpText: (
        <FormattedMessage
          id="xpack.idxMgmt.templateForm.stepLogistics.fieldIndexPatternsHelpText"
          defaultMessage="Spaces and the characters {invalidCharactersList} are not allowed."
          values={{
            invalidCharactersList: <strong>{indexPatternInvalidCharacters}</strong>,
          }}
        />
      ),
      validations: [
        {
          validator: emptyField(
            i18n.translate('xpack.idxMgmt.templateValidation.indexPatternsRequiredError', {
              defaultMessage: 'At least one index pattern is required.',
            })
          ),
        },
        {
          validator: indexPatternField(i18n),
          type: VALIDATION_TYPES.ARRAY_ITEM,
        },
      ],
    },
    order: {
      type: FIELD_TYPES.NUMBER,
      label: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.fieldOrderLabel', {
        defaultMessage: 'Order (optional)',
      }),
      formatters: [toInt],
    },
    version: {
      type: FIELD_TYPES.NUMBER,
      label: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.fieldVersionLabel', {
        defaultMessage: 'Version (optional)',
      }),
      formatters: [toInt],
    },
  },
};
