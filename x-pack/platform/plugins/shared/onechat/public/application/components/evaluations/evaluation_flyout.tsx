/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyout, EuiFlyoutHeader, EuiTitle, EuiFlyoutBody, EuiCodeBlock } from '@elastic/eui';
import { css } from '@emotion/react';

interface FlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  content?: Record<string, any>;
}

export const EvaluationFlyout: React.FC<FlyoutProps> = ({ isOpen, onClose, content }) => {
  if (!isOpen) return null;

  return (
    <EuiFlyout onClose={onClose} aria-label="" size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>Qualitative Analysis</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiCodeBlock
          language="json"
          fontSize="s"
          paddingSize="m"
          isCopyable={true}
          css={css`
            overflow: auto;
          `}
        >
          {JSON.stringify(content, null, 2)}
        </EuiCodeBlock>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
