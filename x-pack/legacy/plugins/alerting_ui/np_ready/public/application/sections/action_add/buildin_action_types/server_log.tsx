/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldText } from '@elastic/eui';
import { ActionTypeModel, ValidationResult, ParamsProps } from '../../../../types';
import { ErrableFormRow } from '../../../components/page_error';

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
    actionParamsFields: ServerLogParamsFields,
  };
}

export const ServerLogParamsFields: React.FunctionComponent<ParamsProps> = ({
  action,
  editAction,
  errors,
  hasErrors,
}) => {
  const { text } = action;
  return (
    <ErrableFormRow
      id="loggingText"
      errorKey="text"
      fullWidth
      errors={errors}
      isShowingErrors={hasErrors === true && text !== undefined}
      label={i18n.translate(
        'xpack.alertingUI.sections.actionAdd.serverLogAction.logTextFieldLabel',
        {
          defaultMessage: 'Log text',
        }
      )}
    >
      <EuiFieldText
        fullWidth
        name="text"
        value={text || ''}
        data-test-subj="loggingTextInput"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          editAction('text', e.target.value);
        }}
        onBlur={() => {
          if (!text) {
            editAction('text', '');
          }
        }}
      />
    </ErrableFormRow>
  );
};
