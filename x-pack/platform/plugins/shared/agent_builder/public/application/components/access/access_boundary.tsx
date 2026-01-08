/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode, useEffect, useState } from 'react';
import type { AgentBuilderAccess } from '../../../services/access/access';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { AddLlmConnectionPrompt } from './prompts/add_llm_connection_prompt';
import { UpgradeLicensePrompt } from './prompts/upgrade_license_prompt';

export const AccessBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { accessChecker } = useAgentBuilderServices();

  // Default to access granted to optimize for the happy path and avoid loading spinner flash
  const [access, setAccess] = useState<AgentBuilderAccess>({
    hasRequiredLicense: true,
    hasLlmConnector: true,
  });

  useEffect(() => {
    accessChecker.getAccess().then(
      (result) => {
        setAccess(result);
      },
      () => {
        setAccess({ hasRequiredLicense: false, hasLlmConnector: false });
      }
    );
  }, [accessChecker]);

  const { hasRequiredLicense, hasLlmConnector } = access;

  if (!hasRequiredLicense) {
    return <UpgradeLicensePrompt />;
  }

  if (!hasLlmConnector) {
    return <AddLlmConnectionPrompt />;
  }

  return children;
};
