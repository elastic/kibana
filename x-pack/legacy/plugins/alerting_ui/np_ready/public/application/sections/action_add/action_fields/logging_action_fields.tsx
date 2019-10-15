/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../../../components/page_error';
import { Action } from '../../../lib/api';

interface Props {
  action: Action;
  // editAction: (changedProperty: { key: string; value: string }) => void;
  errors: { [key: string]: string[] };
  hasErrors: boolean;
}

export const LoggingActionFields: React.FunctionComponent<Props> = ({
  action,
  // editAction,
  errors,
  hasErrors,
}) => {
  const { text }: any = action.config;
  return (
    <ErrableFormRow
      id="loggingText"
      errorKey="text"
      fullWidth
      errors={errors}
      isShowingErrors={hasErrors && text !== undefined}
      label={i18n.translate('xpack.alertingUI.sections.actionAdd.loggingAction.logTextFieldLabel', {
        defaultMessage: 'Log text',
      })}
    >
      <EuiFieldText
        fullWidth
        name="text"
        value={text || ''}
        data-test-subj="loggingTextInput"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          // editAction({ key: 'text', value: e.target.value });
        }}
        onBlur={() => {
          if (!text) {
            // editAction({ key: 'text', value: '' });
          }
        }}
      />
    </ErrableFormRow>
  );
};
