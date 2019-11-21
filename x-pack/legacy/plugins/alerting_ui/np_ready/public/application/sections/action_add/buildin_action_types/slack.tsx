/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFieldText, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../../../components/page_error';
import {
  ActionTypeModel,
  Props,
  Action,
  ValidationResult,
  ActionParamsProps,
} from '../../../../types';

export function getActionType(): ActionTypeModel {
  return {
    id: '.slack',
    iconClass: 'logoSlack',
    selectMessage: i18n.translate(
      'xpack.alertingUI.sections.actionAdd.slackAction.selectMessageText',
      {
        defaultMessage: 'Send a message to a Slack user or channel.',
      }
    ),
    validate: (action: Action): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        webhookUrl: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!action.secrets.webhookUrl) {
        errors.webhookUrl.push(
          i18n.translate(
            'xpack.alertingUI.sections.actionAdd.slackAction.error.requiredWebhookUrlText',
            {
              defaultMessage: 'WebhookUrl is required.',
            }
          )
        );
      }
      return validationResult;
    },
    validateParams: (action: Action): ValidationResult => {
      const validationResult = { errors: {} };
      return validationResult;
    },
    actionFields: SlackActionFields,
    actionParamsFields: SlackParamsFields,
  };
}

const SlackActionFields: React.FunctionComponent<Props> = ({
  action,
  editActionSecrets,
  errors,
  hasErrors,
}) => {
  const { webhookUrl } = action.secrets;

  return (
    <Fragment>
      <ErrableFormRow
        id="webhookUrl"
        errorKey="webhookUrl"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors === true && webhookUrl !== undefined}
        label={i18n.translate(
          'xpack.alertingUI.sections.actionAdd.slackAction.webhookUrlTextFieldLabel',
          {
            defaultMessage: 'WebhookUrl',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="webhookUrl"
          value={webhookUrl || ''}
          data-test-subj="slackWebhookUrlTextarea"
          onChange={e => {
            editActionSecrets('webhookUrl', e.target.value);
          }}
          onBlur={() => {
            if (!webhookUrl) {
              editActionSecrets('webhookUrl', '');
            }
          }}
        />
      </ErrableFormRow>
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
      <ErrableFormRow
        id="slackMessage"
        errorKey="message"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors && message !== undefined}
        label={i18n.translate(
          'xpack.alertingUI.sections.actionAdd.slackAction.messageTextAreaFieldLabel',
          {
            defaultMessage: 'Message',
          }
        )}
      >
        <EuiTextArea
          fullWidth
          name="message"
          value={message}
          data-test-subj="slackMessageTextarea"
          onChange={e => {
            editAction('message', e.target.value, index);
          }}
        />
      </ErrableFormRow>
    </Fragment>
  );
};
