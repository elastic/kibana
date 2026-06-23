/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiButton, EuiFlexGroup, EuiSpacer, EuiText } from '@elastic/eui';
import {
  DASHBOARDS_APP_ID,
  DISCOVER_APP_ID,
  useNavigation,
  useOrchestratedAppId,
} from '../application/hooks/use_navigation';

const barStyles = css`
  flex-shrink: 0;
  padding: 8px 12px;
  border-top: 1px solid var(--euiColorBorderBaseSubdued, #d3dae6);
  background: var(--euiColorBackgroundBasePlain, #fff);
`;

const buttonRowStyles = css`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

/**
 * POC: explicit cross-app orchestration controls when AB is mounted in the agent chrome slot.
 */
export function AgentWorkspaceOrchestrationBar() {
  const { navigateToOrchestratedApp } = useNavigation();
  const currentAppId = useOrchestratedAppId();

  return (
    <div css={barStyles} data-test-subj="agentWorkspaceOrchestration">
      <EuiText size="xs" color="subdued">
        Application workspace: <strong>{currentAppId ?? 'none'}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiFlexGroup css={buttonRowStyles} gutterSize="s" responsive={false} wrap>
        <EuiButton
          size="s"
          onClick={() => navigateToOrchestratedApp(DISCOVER_APP_ID)}
          data-test-subj="agentWorkspaceOpenDiscover"
        >
          Open Discover
        </EuiButton>
        <EuiButton
          size="s"
          onClick={() => navigateToOrchestratedApp(DASHBOARDS_APP_ID)}
          data-test-subj="agentWorkspaceOpenDashboards"
        >
          Open Dashboard
        </EuiButton>
      </EuiFlexGroup>
    </div>
  );
}
