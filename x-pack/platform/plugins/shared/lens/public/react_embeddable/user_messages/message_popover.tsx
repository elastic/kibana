/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {  useEuiFontSize, euiThemeCssVariables } from '@elastic/eui';
import { css } from '@emotion/react';

import React from 'react';
import { MessageList } from '../../editor_frame_service/editor_frame/workspace_panel/message_list';
import { UserMessage } from '../../types';

export const MessagesPopover = ({ messages }: { messages: UserMessage[] }) => {
  const xsFontSize = useEuiFontSize('xs').fontSize;

  if (!messages.length) {
    return null;
  }

  return (
    <MessageList
      messages={messages}
      customButtonStyles={css`
        block-size: ${euiThemeCssVariables.size.l};
        font-size: ${xsFontSize};
        padding: 0 ${euiThemeCssVariables.size.xs};
        & > * {
          gap: ${euiThemeCssVariables.size.xs};
        }
      `}
    />
  );
};
