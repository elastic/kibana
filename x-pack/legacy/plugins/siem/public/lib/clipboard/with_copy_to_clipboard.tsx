/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import styled from 'styled-components';

import { Clipboard } from './clipboard';

const WithCopyToClipboardContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  user-select: text;
`;

WithCopyToClipboardContainer.displayName = 'WithCopyToClipboardContainer';

/**
 * Renders `children` with an adjacent icon that when clicked, copies `text` to
 * the clipboard and displays a confirmation toast
 */
export const WithCopyToClipboard = React.memo<{ text: string; titleSummary?: string }>(
  ({ text, titleSummary, children }) => (
    <WithCopyToClipboardContainer>
      <>{children}</>
      <Clipboard content={text} titleSummary={titleSummary} toastLifeTimeMs={800} />
    </WithCopyToClipboardContainer>
  )
);

WithCopyToClipboard.displayName = 'WithCopyToClipboard';
