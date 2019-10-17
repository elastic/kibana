/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiComboBox, EuiTextArea, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Action } from '../../../lib/api';

interface Props {
  action: Action;
  editActionConfig: (property: string, value: any) => void;
  children: React.ReactNode;
}

export const SlackActionFields: React.FunctionComponent<Props> = ({
  action,
  editActionConfig,
  children,
}) => {
  const { text, to }: any = action.config;
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
            editActionConfig('to', newOptions.map(newOption => newOption.label));
          }}
          onChange={(selectedOptions: Array<{ label: string }>) => {
            editActionConfig('to', selectedOptions.map(selectedOption => selectedOption.label));
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
            editActionConfig('text', e.target.value);
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
};
