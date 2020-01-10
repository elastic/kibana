/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSelect, EuiTextArea, EuiFormRow } from '@elastic/eui';
import { ActionTypeModel, ValidationResult, ActionParamsProps } from '../../../types';

export function getActionType(): ActionTypeModel {
  return {
    id: '.server-log',
    iconClass: 'logsApp',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.serverLogAction.selectMessageText',
      {
        defaultMessage: 'Add a message to a Kibana log.',
      }
    ),
    validateConnector: (): ValidationResult => {
      return { errors: {} };
    },
    validateParams: (actionParams: any): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        message: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!actionParams.message || actionParams.message.length === 0) {
        errors.message.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredServerLogMessageText',
            {
              defaultMessage: 'Message is required.',
            }
          )
        );
      }
      return validationResult;
    },
    actionConnectorFields: null,
    actionParamsFields: ServerLogParamsFields,
  };
}

export const ServerLogParamsFields: React.FunctionComponent<ActionParamsProps> = ({
  action,
  editAction,
  index,
  errors,
  hasErrors,
}) => {
  const { message, level } = action;
  const levelOptions = [
    { value: 'trace', text: 'Trace' },
    { value: 'debug', text: 'Debug' },
    { value: 'info', text: 'Info' },
    { value: 'warn', text: 'Warning' },
    { value: 'error', text: 'Error' },
    { value: 'fatal', text: 'Fatal' },
  ];

  // Set default value 'info' for level param
  editAction('level', 'info', index);

  return (
    <Fragment>
      <EuiFormRow
        id="loggingLevel"
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.serverLogAction.logLevelFieldLabel',
          {
            defaultMessage: 'Level',
          }
        )}
      >
        <EuiSelect
          fullWidth
          id="loggLevelSelect"
          data-test-subj="loggingLevelSelect"
          options={levelOptions}
          value={level}
          defaultValue={'info'}
          onChange={e => {
            editAction('level', e.target.value, index);
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        id="loggingMessage"
        fullWidth
        error={errors.message}
        isInvalid={hasErrors && message !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.serverLogAction.logMessageFieldLabel',
          {
            defaultMessage: 'Message',
          }
        )}
      >
        <EuiTextArea
          fullWidth
          isInvalid={hasErrors && message !== undefined}
          value={message || ''}
          name="message"
          data-test-subj="loggingMessageInput"
          onChange={e => {
            editAction('message', e.target.value, index);
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
};
