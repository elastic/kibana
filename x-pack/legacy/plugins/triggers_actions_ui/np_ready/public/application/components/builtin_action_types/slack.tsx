/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import {
  EuiFieldText,
  EuiTextArea,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiFormRow,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  ActionTypeModel,
  ActionConnectorFieldsProps,
  ActionConnector,
  ValidationResult,
  ActionParamsProps,
} from '../../../types';

export function getActionType(): ActionTypeModel {
  return {
    id: '.slack',
    iconClass: 'logoSlack',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.selectMessageText',
      {
        defaultMessage: 'Send a message to a Slack channel or user.',
      }
    ),
    validateConnector: (action: ActionConnector): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        webhookUrl: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!action.secrets.webhookUrl) {
        errors.webhookUrl.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.error.requiredWebhookUrlText',
            {
              defaultMessage: 'Webhook URL is required.',
            }
          )
        );
      }
      return validationResult;
    },
    validateParams: (actionParams: any): ValidationResult => {
      const validationResult = { errors: {} };
      return validationResult;
    },
    actionConnectorFields: SlackActionFields,
    actionParamsFields: SlackParamsFields,
  };
}

const SlackActionFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  action,
  editActionSecrets,
  errors,
}) => {
  const { webhookUrl } = action.secrets;

  return (
    <Fragment>
      <EuiFormRow
        id="webhookUrl"
        fullWidth
        helpText={
          <EuiLink
            href="https://www.elastic.co/guide/en/elasticsearch/reference/current/actions-slack.html#configuring-slack"
            target="_blank"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.components.builtinActionTypes.slackAction.indexNameHelpLabel"
              defaultMessage="Learn how to create a Slack webhook URL"
            />
          </EuiLink>
        }
        error={errors.webhookUrl}
        isInvalid={errors.webhookUrl.length > 0 && webhookUrl !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.webhookUrlTextFieldLabel',
          {
            defaultMessage: 'Webhook URL',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          isInvalid={errors.webhookUrl.length > 0 && webhookUrl !== undefined}
          name="webhookUrl"
          placeholder="URL like https://hooks.slack.com/services"
          value={webhookUrl || ''}
          data-test-subj="slackWebhookUrlInput"
          onChange={e => {
            editActionSecrets('webhookUrl', e.target.value);
          }}
          onBlur={() => {
            if (!webhookUrl) {
              editActionSecrets('webhookUrl', '');
            }
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
};

const SlackParamsFields: React.FunctionComponent<ActionParamsProps> = ({
  action,
  editAction,
  index,
  errors,
  hasErrors,
}) => {
  const { message } = action;

  return (
    <Fragment>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiButtonIcon
            onClick={() => window.alert('Button clicked')}
            iconType="indexOpen"
            aria-label="Add variable"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFormRow
        id="slackMessage"
        fullWidth
        error={errors.message}
        isInvalid={hasErrors && message !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.messageTextAreaFieldLabel',
          {
            defaultMessage: 'Message',
          }
        )}
      >
        <EuiTextArea
          fullWidth
          isInvalid={hasErrors && message !== undefined}
          name="message"
          value={message}
          data-test-subj="slackMessageTextarea"
          onChange={e => {
            editAction('message', e.target.value, index);
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
};
