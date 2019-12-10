/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash/fp';
import React from 'react';

import * as CreateRuleI18n from '../../translations';
import { IMitreEnterpriseAttack } from '../../types';
import {
  FIELD_TYPES,
  fieldValidators,
  FormSchema,
  ValidationFunc,
  ERROR_CODE,
} from '../shared_imports';
import * as I18n from './translations';

const { emptyField } = fieldValidators;

export const schema: FormSchema = {
  name: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.siem.detectionEngine.createRule.stepAboutRule.fieldNameLabel', {
      defaultMessage: 'Name',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.siem.detectionEngine.createRule.stepAboutRule.nameFieldRequiredError',
            {
              defaultMessage: 'A name is required.',
            }
          )
        ),
      },
    ],
  },
  description: {
    type: FIELD_TYPES.TEXTAREA,
    label: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepAboutRule.fieldDescriptionLabel',
      {
        defaultMessage: 'Description',
      }
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.siem.detectionEngine.createRule.stepAboutRule.descriptionFieldRequiredError',
            {
              defaultMessage: 'A description is required.',
            }
          )
        ),
      },
    ],
  },
  severity: {
    type: FIELD_TYPES.SELECT,
    label: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepAboutRule.fieldSeverityLabel',
      {
        defaultMessage: 'Severity',
      }
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.siem.detectionEngine.createRule.stepAboutRule.severityFieldRequiredError',
            {
              defaultMessage: 'A severity is required.',
            }
          )
        ),
      },
    ],
  },
  riskScore: {
    type: FIELD_TYPES.RANGE,
    label: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepAboutRule.fieldRiskScoreLabel',
      {
        defaultMessage: 'Risk score',
      }
    ),
  },
  references: {
    label: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepAboutRule.fieldReferenceUrlsLabel',
      {
        defaultMessage: 'Reference URLs',
      }
    ),
    labelAppend: <EuiText size="xs">{CreateRuleI18n.OPTIONAL_FIELD}</EuiText>,
  },
  falsePositives: {
    label: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepAboutRule.fieldFalsePositiveLabel',
      {
        defaultMessage: 'False positives',
      }
    ),
    labelAppend: <EuiText size="xs">{CreateRuleI18n.OPTIONAL_FIELD}</EuiText>,
  },
  threats: {
    label: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepAboutRule.fieldMitreThreatLabel',
      {
        defaultMessage: 'MITRE ATT&CK',
      }
    ),
    labelAppend: <EuiText size="xs">{CreateRuleI18n.OPTIONAL_FIELD}</EuiText>,
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ value, path }] = args;
          let hasError = false;
          (value as IMitreEnterpriseAttack[]).forEach(v => {
            if (isEmpty(v.tactic.name) || (v.tactic.name !== 'none' && isEmpty(v.techniques))) {
              hasError = true;
            }
          });
          return hasError
            ? {
                code: 'ERR_FIELD_MISSING',
                path,
                message: I18n.CUSTOM_MITRE_ATTACK_TECHNIQUES_REQUIRED,
              }
            : undefined;
        },
      },
    ],
  },
  tags: {
    type: FIELD_TYPES.COMBO_BOX,
    label: i18n.translate('xpack.siem.detectionEngine.createRule.stepAboutRule.fieldTagsLabel', {
      defaultMessage: 'Tags',
    }),
    labelAppend: <EuiText size="xs">{CreateRuleI18n.OPTIONAL_FIELD}</EuiText>,
  },
};
