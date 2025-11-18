/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { ToolDefinition } from '@kbn/agent-builder-common';
import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { ToolsSelection } from '../tools_selection';
import type { AgentFormData } from '../agent_form';
import { useUiPrivileges } from '../../../../hooks/use_ui_privileges';

interface ToolsTabProps {
  control: Control<AgentFormData>;
  tools: ToolDefinition[];
  isLoading: boolean;
  isFormDisabled: boolean;
}

export const ToolsTab: React.FC<ToolsTabProps> = ({
  control,
  tools,
  isLoading,
  isFormDisabled,
}) => {
  const { manageTools } = useUiPrivileges();
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  return (
    <>
      <EuiSpacer size="l" />
      <Controller
        name="configuration.tools"
        control={control}
        render={({ field }) => (
          <ToolsSelection
            tools={tools}
            toolsLoading={isLoading}
            selectedTools={field.value}
            onToolsChange={field.onChange}
            disabled={isFormDisabled}
            showActiveOnly={showActiveOnly || !manageTools} // For readonly users, show only active tools
            onShowActiveOnlyChange={setShowActiveOnly}
          />
        )}
      />
    </>
  );
};
