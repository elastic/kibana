/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { AddLlmConnectionPrompt } from './prompts/add_llm_connection_prompt';
import { UpgradeLicensePrompt } from './prompts/upgrade_license_prompt';

export const AccessBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { accessChecker } = useAgentBuilderServices();
  const { hasRequiredLicense, hasLlmConnector } = accessChecker.getAccess();

  if (!hasRequiredLicense) {
    return <UpgradeLicensePrompt />;
  }

  if (!hasLlmConnector) {
    return <AddLlmConnectionPrompt />;
  }

  return children;
};
