/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTextArea, EuiFieldText } from '@elastic/eui';
import {
  ActionConnectorFieldsProps,
  ActionTypeModel,
  ValidationResult,
  ActionParamsProps,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../plugins/triggers_actions_ui/public/types';

interface ExampleActionParams {
  message: string;
}

export function getActionType(): ActionTypeModel {
  return {
    id: '.example-action',
    iconClass: 'logoGmail',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.exampleAction.selectMessageText',
      {
        defaultMessage: 'Example Action is used to show how to create new action type UI.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.exampleAction.actionTypeTitle',
      {
        defaultMessage: 'Example Action',
      }
    ),
    validateConnector: (action: ExampleActionConnector): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        someConnectorField: [] as string[],
      };
      validationResult.errors = errors;
      if (!action.config.someConnectorField) {
        errors.someConnectorField.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredSomeConnectorFieldeText',
            {
              defaultMessage: 'SomeConnectorField is required.',
            }
          )
        );
      }
      return validationResult;
    },
    validateParams: (actionParams: ExampleActionParams): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        message: [] as string[],
      };
      validationResult.errors = errors;
      if (!actionParams.message?.length) {
        errors.message.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredExampleMessageText',
            {
              defaultMessage: 'Message is required.',
            }
          )
        );
      }
      return validationResult;
    },
    actionConnectorFields: ExampleConnectorFields,
    actionParamsFields: ExampleParamsFields,
  };
}

interface ExampleActionConnector {
  config: {
    someConnectorField: string;
  };
}

const ExampleConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps<
  ExampleActionConnector
>> = ({ action, editActionConfig, errors }) => {
  const { someConnectorField } = action.config;
  return (
    <>
      <EuiFieldText
        fullWidth
        isInvalid={errors.someConnectorField.length > 0 && someConnectorField !== undefined}
        name="someConnectorField"
        value={someConnectorField || ''}
        onChange={e => {
          editActionConfig('someConnectorField', e.target.value);
        }}
        onBlur={() => {
          if (!someConnectorField) {
            editActionConfig('someConnectorField', '');
          }
        }}
      />
    </>
  );
};

const ExampleParamsFields: React.FunctionComponent<ActionParamsProps<ExampleActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
}) => {
  const { message } = actionParams;
  return (
    <>
      <EuiTextArea
        fullWidth
        isInvalid={errors.message.length > 0 && message !== undefined}
        name="message"
        value={message || ''}
        onChange={e => {
          editAction('message', e.target.value, index);
        }}
        onBlur={() => {
          if (!message) {
            editAction('message', '', index);
          }
        }}
      />
    </>
  );
};
