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
  editActionConfig: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
  hasErrors: boolean;
}

export const LoggingActionFields: React.FunctionComponent<Props> = ({
  action,
  editActionConfig,
  errors,
  hasErrors,
}) => {
  const { text } = action.config;
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
          editActionConfig('text', e.target.value);
        }}
        onBlur={() => {
          if (!text) {
            editActionConfig('text', '');
          }
        }}
      />
    </ErrableFormRow>
  );
};
