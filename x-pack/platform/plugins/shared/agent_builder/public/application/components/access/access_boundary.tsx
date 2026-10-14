/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { useUiPrivileges } from '../../hooks/use_ui_privileges';
import { useBreadcrumb } from '../../hooks/use_breadcrumbs';
import { AddLlmConnectionPrompt } from './prompts/add_llm_connection_prompt';
import { NoPrivilegePrompt } from './prompts/no_privilege_prompt';
import { UpgradeLicensePrompt } from './prompts/upgrade_license_prompt';

const AccessPromptWithBreadcrumb: React.FC<{ children: ReactNode }> = ({ children }) => {
  useBreadcrumb([]);
  return <>{children}</>;
};

export const AccessBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { accessChecker } = useAgentBuilderServices();
  const { hasRequiredLicense, hasLlmConnector } = accessChecker.getAccess();
  const { show: hasShowPrivilege } = useUiPrivileges();

  if (!hasRequiredLicense) {
    return (
      <AccessPromptWithBreadcrumb>
        <UpgradeLicensePrompt />
      </AccessPromptWithBreadcrumb>
    );
  }

  if (!hasShowPrivilege) {
    return (
      <AccessPromptWithBreadcrumb>
        <NoPrivilegePrompt />
      </AccessPromptWithBreadcrumb>
    );
  }

  if (!hasLlmConnector) {
    return (
      <AccessPromptWithBreadcrumb>
        <AddLlmConnectionPrompt />
      </AccessPromptWithBreadcrumb>
    );
  }

  return children;
};
