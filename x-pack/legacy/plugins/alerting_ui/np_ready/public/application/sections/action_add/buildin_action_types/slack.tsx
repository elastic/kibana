/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../../../components/page_error';
import { ActionTypeModel, Props, Action } from '../../../../types';

export function getActionType(): ActionTypeModel {
  return {
    id: '.slack',
    iconClass: 'logoSlack',
    selectMessage: i18n.translate(
      'xpack.alertingUI.sections.actions.slackAction.selectMessageText',
      {
        defaultMessage: 'Send a message to a Slack user or channel.',
      }
    ),
    simulatePrompt: i18n.translate(
      'xpack.alertingUI.sections.actions.slackAction.simulateButtonLabel',
      {
        defaultMessage: 'Send a sample message',
      }
    ),
    validate: (action: Action): any => {
      const validationResult = { errors: {} };
      const errors = {
        webhookUrl: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!action.secrets.webhookUrl) {
        errors.webhookUrl.push(
          i18n.translate('xpack.alertingUI.sections.addAction.error.requiredWebhookUrlText', {
            defaultMessage: 'WebhookUrl is required.',
          })
        );
      }
      return validationResult;
    },
    actionFields: SlackActionFields,
  };
}

const SlackActionFields: React.FunctionComponent<Props> = ({
  action,
  editActionSecrets,
  errors,
  hasErrors,
}) => {
  const { webhookUrl }: any = action.secrets;

  return (
    <Fragment>
      <ErrableFormRow
        id="webhookUrl"
        errorKey="webhookUrl"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors === true && webhookUrl !== undefined}
        label={i18n.translate(
          'xpack.alertingUI.sections.actionAdd.slackPassword.methodWebhookUrlLabel',
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
