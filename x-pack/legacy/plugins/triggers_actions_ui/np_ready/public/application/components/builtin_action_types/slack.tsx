/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState, useEffect } from 'react';
import {
  EuiFieldText,
  EuiTextArea,
  EuiButtonIcon,
  EuiFormRow,
  EuiLink,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  ActionTypeModel,
  ActionConnectorFieldsProps,
  ValidationResult,
  ActionParamsProps,
} from '../../../types';
import { SlackActionParams, SlackActionConnector } from './types';

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
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.actionTypeTitle',
      {
        defaultMessage: 'Send to Slack',
      }
    ),
    validateConnector: (action: SlackActionConnector): ValidationResult => {
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
    validateParams: (actionParams: SlackActionParams): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        message: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!actionParams.message?.length) {
        errors.message.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredSlackMessageText',
            {
              defaultMessage: 'Message is required.',
            }
          )
        );
      }
      return validationResult;
    },
    actionConnectorFields: SlackActionFields,
    actionParamsFields: SlackParamsFields,
  };
}

const SlackActionFields: React.FunctionComponent<ActionConnectorFieldsProps<
  SlackActionConnector
>> = ({ action, editActionSecrets, errors }) => {
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
              id="xpack.triggersActionsUI.components.builtinActionTypes.slackAction.webhookUrlHelpLabel"
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

const SlackParamsFields: React.FunctionComponent<ActionParamsProps<SlackActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
  defaultMessage,
}) => {
  const { message } = actionParams;
  const [isVariablesPopoverOpen, setIsVariablesPopoverOpen] = useState<boolean>(false);
  useEffect(() => {
    if (defaultMessage && defaultMessage.length > 0) {
      editAction('message', defaultMessage, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const messageVariablesItems = messageVariables?.map((variable: string, i: number) => (
    <EuiContextMenuItem
      key={variable}
      data-test-subj={`variableMenuButton-${i}`}
      icon="empty"
      onClick={() => {
        editAction('message', (message ?? '').concat(` {{${variable}}}`), index);
        setIsVariablesPopoverOpen(false);
      }}
    >
      {`{{${variable}}}`}
    </EuiContextMenuItem>
  ));
  return (
    <Fragment>
      <EuiFormRow
        id="slackMessage"
        fullWidth
        error={errors.message}
        isInvalid={errors.message.length > 0 && message !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.messageTextAreaFieldLabel',
          {
            defaultMessage: 'Message',
          }
        )}
        labelAppend={
          <EuiPopover
            id="singlePanel"
            button={
              <EuiButtonIcon
                data-test-subj="slackAddVariableButton"
                onClick={() => setIsVariablesPopoverOpen(true)}
                iconType="indexOpen"
                aria-label={i18n.translate(
                  'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.addVariablePopoverButton',
                  {
                    defaultMessage: 'Add variable',
                  }
                )}
              />
            }
            isOpen={isVariablesPopoverOpen}
            closePopover={() => setIsVariablesPopoverOpen(false)}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenuPanel items={messageVariablesItems} />
          </EuiPopover>
        }
      >
        <EuiTextArea
          fullWidth
          isInvalid={errors.message.length > 0 && message !== undefined}
          name="message"
          value={message || ''}
          data-test-subj="slackMessageTextArea"
          onChange={e => {
            editAction('message', e.target.value, index);
          }}
          onBlur={() => {
            if (!message) {
              editAction('message', '', index);
            }
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
};
