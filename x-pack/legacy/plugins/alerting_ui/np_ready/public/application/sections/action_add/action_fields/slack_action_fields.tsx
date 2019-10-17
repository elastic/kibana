/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Action } from '../../../lib/api';
import { ErrableFormRow } from '../../../components/page_error';

interface Props {
  action: Action;
  editActionSecrets: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
  hasErrors: boolean;
}

export const SlackActionFields: React.FunctionComponent<Props> = ({
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
        isShowingErrors={hasErrors && webhookUrl !== undefined}
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
