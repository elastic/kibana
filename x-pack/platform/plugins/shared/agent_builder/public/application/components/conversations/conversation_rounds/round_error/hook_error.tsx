/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiText } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { borderRadiusXlStyles } from '../../../../../common.styles';

interface HookErrorData {
  message: string;
  meta?: {
    hookId?: string;
    hookLifecycle?: string;
    hookMode?: string;
  };
}

interface HookErrorProps {
  error: HookErrorData;
}

export const HookError: React.FC<HookErrorProps> = ({ error }) => {
  const hookId = error.meta?.hookId ?? 'unknown';
  const hookLifecycle = error.meta?.hookLifecycle ?? 'unknown';
  const hookMode = error.meta?.hookMode ?? 'unknown';

  return (
    <EuiCallOut
      color="danger"
      title={
        <FormattedMessage
          id="xpack.agentBuilder.round.error.hook.title"
          defaultMessage="Hook execution failed"
        />
      }
      iconType="error"
      css={borderRadiusXlStyles}
      data-test-subj="agentBuilderErrorHookExecution"
    >
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.agentBuilder.round.error.hook.description"
            defaultMessage='Hook "{hookId}" failed during "{hookLifecycle}" ({hookMode}): {message}'
            values={{
              hookId,
              hookLifecycle,
              hookMode,
              message: error.message,
            }}
          />
        </p>
      </EuiText>
    </EuiCallOut>
  );
};
