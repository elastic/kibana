/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiFormRow, EuiTextArea } from '@elastic/eui';
import { SystemLogActionParams } from '../types';

export const ServerLogParamsFields: React.FunctionComponent<
  ActionParamsProps<SystemLogActionParams>
> = ({ actionParams, editAction, index, errors, messageVariables }) => {
  const { message = 'Alerts have been triggered.' } = actionParams;

  // This params component is derived primarily from server_log_params.tsx, see that file and its
  // corresponding unit tests for details on functionality
  useEffect(() => {
    if (!actionParams?.message) {
      editAction('message', message, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionParams.message]);

  return (
    <EuiFormRow
      fullWidth
      error={errors.message as string[]}
      isInvalid={errors.message.length > 0 && message !== undefined}
      label={i18n.translate(
        'xpack.stackConnectors.components.systemLogExample.logMessageFieldLabel',
        {
          defaultMessage: 'Message',
        }
      )}
    >
      <EuiTextArea
        fullWidth
        isInvalid={errors.message.length > 0 && message !== undefined}
        name={'message'}
        value={message || ''}
        data-test-subj={'messageTextArea'}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          editAction('message', e.target.value, index)
        }
        onBlur={() => {
          if (!message) {
            editAction('message', '', index);
          }
        }}
      />
    </EuiFormRow>
  );
};

// eslint-disable-next-line import/no-default-export
export { ServerLogParamsFields as default };
