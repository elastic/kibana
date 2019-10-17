/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFieldText, EuiFormRow, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Action } from '../../../lib/api';

interface Props {
  action: Action;
  editActionConfig: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
  hasErrors: boolean;
}

export const EmailActionFields: React.FunctionComponent<Props> = ({
  action,
  editActionConfig,
  errors,
  hasErrors,
}) => {
  const { from, host, port }: any = action.config;

  return (
    <Fragment>
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.alertingUI.sections.actionAdd.emailAction.fromTextFieldLabel',
          {
            defaultMessage: 'From',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="from"
          data-test-subj="emailFromInput"
          value={from || ''}
          onChange={e => {
            editActionConfig('from', e.target.value);
          }}
        />
      </EuiFormRow>

      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.alertingUI.sections.actionAdd.emailAction.subjectTextFieldLabel',
          {
            defaultMessage: 'Subject (optional)',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="subject"
          data-test-subj="emailSubjectInput"
          value={host || ''}
          onChange={e => {
            editActionConfig('subject', e.target.value);
          }}
        />
      </EuiFormRow>

      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.alertingUI.sections.actionAdd.emailAction.messageTextAreaFieldLabel',
          {
            defaultMessage: 'Message',
          }
        )}
      >
        <EuiTextArea
          fullWidth
          value={port || ''}
          name="message"
          data-test-subj="emailMessageInput"
          onChange={e => {
            editActionConfig('message', e.target.value);
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
};
