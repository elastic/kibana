/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import { fromKueryExpression } from '@kbn/es-query';
import { isEmpty } from 'lodash/fp';
import React from 'react';

import {
  FormSchema,
  FIELD_TYPES,
  ValidationFunc,
} from '../../../../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';
import { fieldValidators } from '../../../../../../../../../../src/plugins/es_ui_shared/static/forms/helpers';
import { ERROR_CODE } from '../../../../../../../../../../src/plugins/es_ui_shared/static/forms/helpers/field_validators/types';

import * as globalI18n from '../../translations';

import { FieldValueQueryBar } from '../query_bar';
import { CUSTOM_QUERY_REQUIRED, INVALID_CUSTOM_QUERY } from './translations';

const { emptyField } = fieldValidators;

export const schema: FormSchema = {
  outputIndex: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepDefineRule.fieldOutputIndiceNameLabel',
      {
        defaultMessage: 'Output index name',
      }
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.siem.detectionEngine.createRule.stepDefineRule.outputIndiceNameFieldRequiredError',
            {
              defaultMessage: 'An output indice name for signals is required.',
            }
          )
        ),
      },
    ],
  },
  useIndicesConfig: {
    type: FIELD_TYPES.RADIO_GROUP,
    label: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepDefineRule.fieldIndicesTypeLabel',
      {
        defaultMessage: 'Indices type',
      }
    ),
    options: [
      {
        id: 'true',
        label: i18n.translate(
          'xpack.siem.detectionEngine.createRule.stepDefineRule.indicesFromConfigDescription',
          {
            defaultMessage: 'Use Elasticsearch indices from SIEM advanced settings',
          }
        ),
      },
      {
        id: 'false',
        label: i18n.translate(
          'xpack.siem.detectionEngine.createRule.stepDefineRule.indicesCustomDescription',
          {
            defaultMessage: 'Provide custom list of indices',
          }
        ),
      },
    ],
  },
  index: {
    type: FIELD_TYPES.COMBO_BOX,
    label: i18n.translate('xpack.siem.detectionEngine.createRule.stepAboutRule.fiedIndicesLabel', {
      defaultMessage: 'Indices',
    }),
    labelAppend: <EuiText size="xs">{globalI18n.OPTIONAL_FIELD}</EuiText>,
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.siem.detectionEngine.createRule.stepDefineRule.outputIndiceNameFieldRequiredError',
            {
              defaultMessage: 'An output indice name for signals is required.',
            }
          )
        ),
      },
    ],
  },
  queryBar: {
    label: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepDefineRule.fieldQuerBarLabel',
      {
        defaultMessage: 'Custom query',
      }
    ),
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ value, path }] = args;
          const { query, filters } = value as FieldValueQueryBar;
          return isEmpty(query.query as string) && isEmpty(filters)
            ? {
                code: 'ERR_FIELD_MISSING',
                path,
                message: CUSTOM_QUERY_REQUIRED,
              }
            : undefined;
        },
      },
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ value, path }] = args;
          const { query } = value as FieldValueQueryBar;
          if (!isEmpty(query.query as string) && query.language === 'kuery') {
            try {
              fromKueryExpression(query.query);
            } catch (err) {
              return {
                code: 'ERR_FIELD_FORMAT',
                path,
                message: INVALID_CUSTOM_QUERY,
              };
            }
          }
          return undefined;
        },
      },
    ],
  },
};
