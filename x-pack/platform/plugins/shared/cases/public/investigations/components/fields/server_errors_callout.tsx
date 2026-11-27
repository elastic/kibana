/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ICONS } from '../../icons';
import * as i18n from './translations';

export interface ServerErrorsCalloutProps {
  messages: string[];
  title?: string;
  'data-test-subj'?: string;
}

/** Errors Cases returned that belong to no visible field, listed as plain text. */
export const ServerErrorsCallout: React.FC<ServerErrorsCalloutProps> = ({
  messages,
  title = i18n.SERVER_ERRORS_TITLE,
  'data-test-subj': dataTestSubj = 'investigationServerErrors',
}) => {
  const { euiTheme } = useEuiTheme();

  if (messages.length === 0) {
    return null;
  }

  return (
    <EuiCallOut
      announceOnMount
      color="danger"
      iconType={ICONS.error}
      title={title}
      size="s"
      data-test-subj={dataTestSubj}
    >
      <ul
        css={css`
          margin: 0;
          padding-inline-start: ${euiTheme.size.base};
          list-style: disc;
        `}
      >
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </EuiCallOut>
  );
};
ServerErrorsCallout.displayName = 'ServerErrorsCallout';
