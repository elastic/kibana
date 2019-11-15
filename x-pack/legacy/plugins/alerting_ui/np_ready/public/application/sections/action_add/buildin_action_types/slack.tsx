/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFieldText, EuiFormRow, EuiComboBox, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../../../components/page_error';
import { ActionTypeModel, Props, Action, ValidationResult, ParamsProps } from '../../../../types';

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

const SlackParamsFields: React.FunctionComponent<ParamsProps> = ({
  action,
  editAction,
  errors,
  hasErrors,
  children,
}) => {
  const { text, to } = action;
  const toOptions = to ? to.map((label: any) => ({ label })) : [];

  return (
    <Fragment>
      {children}
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.alertingUI.sections.actionAdd.slackAction.recipientTextFieldLabel',
          {
            defaultMessage: 'Recipient (optional)',
          }
        )}
      >
        <EuiComboBox
          noSuggestions
          fullWidth
          selectedOptions={toOptions}
          data-test-subj="slackRecipientComboBox"
          onCreateOption={(searchValue: string) => {
            const newOptions = [...toOptions, { label: searchValue }];
            editAction(
              'to',
              newOptions.map(newOption => newOption.label)
            );
          }}
          onChange={(selectedOptions: Array<{ label: string }>) => {
            editAction(
              'to',
              selectedOptions.map(selectedOption => selectedOption.label)
            );
          }}
        />
      </EuiFormRow>

      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.alertingUI.sections.actionAdd.slackAction.messageTextAreaFieldLabel',
          {
            defaultMessage: 'Message (optional)',
          }
        )}
      >
        <EuiTextArea
          fullWidth
          name="text"
          value={text}
          data-test-subj="slackMessageTextarea"
          onChange={e => {
            editAction('text', e.target.value);
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
};
