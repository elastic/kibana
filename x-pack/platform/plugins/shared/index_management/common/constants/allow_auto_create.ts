/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const allowAutoCreateRadioIds = {
  NO_OVERWRITE_RADIO_OPTION: 'NO_OVERWRITE',
  TRUE_RADIO_OPTION: 'TRUE',
  FALSE_RADIO_OPTION: 'FALSE',
};

export const allowAutoCreateRadioValues = {
  [allowAutoCreateRadioIds.NO_OVERWRITE_RADIO_OPTION]: undefined,
  [allowAutoCreateRadioIds.TRUE_RADIO_OPTION]: true,
  [allowAutoCreateRadioIds.FALSE_RADIO_OPTION]: false,
};

export const allowAutoCreateRadios = [
  {
    id: allowAutoCreateRadioIds.NO_OVERWRITE_RADIO_OPTION,
    label: i18n.translate(
      'xpack.idxMgmt.templateForm.stepLogistics.allowAutoCreate.noOverwriteRadioOptionLabel',
      {
        defaultMessage: 'Do not overwrite cluster setting',
      }
    ),
  },
  {
    id: allowAutoCreateRadioIds.TRUE_RADIO_OPTION,
    label: i18n.translate(
      'xpack.idxMgmt.templateForm.stepLogistics.allowAutoCreate.trueRadioOptionLabel',
      {
        defaultMessage: 'True',
      }
    ),
  },
  {
    id: allowAutoCreateRadioIds.FALSE_RADIO_OPTION,
    label: i18n.translate(
      'xpack.idxMgmt.templateForm.stepLogistics.allowAutoCreate.falseRadioOptionLabel',
      {
        defaultMessage: 'False',
      }
    ),
  },
];
