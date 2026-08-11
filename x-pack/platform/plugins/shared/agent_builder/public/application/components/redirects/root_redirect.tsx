/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Navigate } from 'react-router-dom-v5-compat';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

import { useLastAgentId, useLastAgentIdReady } from '../../hooks/use_last_agent_id';
import { appPaths } from '../../utils/app_paths';

/**
 * Root-level redirect that decides which agent's chat the user should land on
 * when they open Agent Builder. We deliberately defer the redirect until the
 * per-space settings query has resolved (`useLastAgentIdReady`) so that
 * restricted users in a space with an assigned default never briefly land on
 * the plugin-wide `elastic-ai-agent`, which they can't see — that transient
 * state would surface the "Agent has been deleted" error in the UI even
 * though the assignment is perfectly valid.
 */
export const RootRedirect: React.FC = () => {
  const isReady = useLastAgentIdReady();
  const lastAgentId = useLastAgentId();

  if (!isReady) {
    return (
      <EuiFlexGroup
        justifyContent="center"
        alignItems="center"
        css={{ minHeight: '200px' }}
        data-test-subj="agentBuilderRootRedirectLoading"
      >
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return <Navigate to={appPaths.agent.root({ agentId: lastAgentId })} replace />;
};
