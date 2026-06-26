/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Global, css, keyframes } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import React, { useMemo } from 'react';

const attachmentHighlightPulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 transparent;
  }
  30% {
    box-shadow: 0 0 0 2px var(--agent-builder-attachment-highlight-color);
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
`;

export const AttachmentHighlightGlobalStyles = () => {
  const { euiTheme } = useEuiTheme();

  const styles = useMemo(
    () =>
      css`
        [data-agent-builder-attachment-highlight='true'] {
          --agent-builder-attachment-highlight-color: ${euiTheme.colors.borderBasePrimary};
          animation: ${attachmentHighlightPulse} 1.5s ease-out;
        }
      `,
    [euiTheme.colors.borderBasePrimary]
  );

  return <Global styles={styles} />;
};
