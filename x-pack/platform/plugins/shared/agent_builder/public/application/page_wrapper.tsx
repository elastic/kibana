/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { ReactNode } from 'react';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common/telemetry';
import React from 'react';
import { AccessBoundary } from './components/access/access_boundary';

const wrapperStyles = css`
  display: inherit;
  height: inherit;
  width: inherit;
  flex: 1 1 0%;
`;

export const PageWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div
      css={wrapperStyles}
      data-ebt-element={AGENT_BUILDER_UI_EBT.element.pageContent}
      data-test-subj="agentBuilderWrapper"
    >
      <AccessBoundary>{children}</AccessBoundary>
    </div>
  );
};
