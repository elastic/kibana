/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React from 'react';

import { esKuery } from '../../../../../../../../../../src/plugins/data/public';
import * as RuleI18n from '../../translations';
import { FieldValueQueryBar } from '../query_bar';
import {
  ERROR_CODE,
  FIELD_TYPES,
  fieldValidators,
  FormSchema,
  ValidationFunc,
} from '../shared_imports';
import { CUSTOM_QUERY_REQUIRED, INVALID_CUSTOM_QUERY } from './translations';

const { emptyField } = fieldValidators;

export const schema: FormSchema = {
  useIndicesConfig: {
    type: FIELD_TYPES.RADIO_GROUP,
    label: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepDefineRule.fieldIndicesTypeLabel',
      {
        defaultMessage: 'Indices type',
      }
    ),
  },
  index: {
    type: FIELD_TYPES.COMBO_BOX,
    label: i18n.translate('xpack.siem.detectionEngine.createRule.stepAboutRule.fiedIndicesLabel', {
      defaultMessage: 'Indices',
    }),
    labelAppend: <EuiText size="xs">{RuleI18n.OPTIONAL_FIELD}</EuiText>,
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
              esKuery.fromKueryExpression(query.query);
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
