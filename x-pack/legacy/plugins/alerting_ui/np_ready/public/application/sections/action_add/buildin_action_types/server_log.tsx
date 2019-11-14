/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { ActionTypeModel, ValidationResult } from '../../../../types';

export function getActionType(): ActionTypeModel {
  return {
    id: '.server-log',
    iconClass: 'logsApp',
    selectMessage: i18n.translate(
      'xpack.alertingUI.sections.actionAdd.serverLogAction.selectMessageText',
      {
        defaultMessage: 'Add an item to the logs.',
      }
    ),
    validate: (): ValidationResult => {
      return { errors: {} };
    },
    actionFields: null,
  };
}
