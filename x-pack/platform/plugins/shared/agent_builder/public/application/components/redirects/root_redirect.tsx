/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';

import { useLastAgentId } from '../../hooks/use_last_agent_id';
import { appPaths } from '../../utils/app_paths';
import { RedirectLoading } from './redirect_loading';

export const RootRedirect: React.FC = () => {
  const { agentId: lastAgentId, isReady } = useLastAgentId();

  if (!isReady) {
    return <RedirectLoading data-test-subj="agentBuilderRootRedirectLoading" />;
  }

  return <Redirect to={appPaths.agent.root({ agentId: lastAgentId })} />;
};
