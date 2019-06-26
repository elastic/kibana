/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { Clipboard } from './clipboard';
import * as i18n from './translations';

const WithCopyToClipboardContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  user-select: text;
`;

/**
 * Renders `children` with an adjacent icon that when clicked, copies `text` to
 * the clipboard and displays a confirmation toast
 */
export const WithCopyToClipboard = pure<{ text: string; titleSummary?: string }>(
  ({ text, titleSummary, children }) => (
    <WithCopyToClipboardContainer>
      <>{children}</>
      <Clipboard content={text} titleSummary={titleSummary} toastLifeTimeMs={800}>
        <EuiIcon
          color="text"
          type="copyClipboard"
          aria-label={`${i18n.COPY} ${text} ${i18n.TO_THE_CLIPBOARD}`}
        />
      </Clipboard>
    </WithCopyToClipboardContainer>
  )
);
