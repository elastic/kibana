/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, euiCanAnimate } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { DataViewIllustration } from '@kbn/shared-ux-prompt-no-data-views';

const gentleFloat = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
`;

const floatStyle = css`
  ${euiCanAnimate} {
    animation: ${gentleFloat} 3s ease-in-out infinite;
  }
`;

export const UploadImage: FC = () => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem />
      <EuiFlexItem grow={false} css={floatStyle}>
        <DataViewIllustration />
      </EuiFlexItem>
      <EuiFlexItem />
    </EuiFlexGroup>
  );
};
