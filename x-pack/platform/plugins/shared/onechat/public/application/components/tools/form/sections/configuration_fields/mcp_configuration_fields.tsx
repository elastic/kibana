/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiHealth,
  EuiSkeletonLoading,
  EuiSkeletonText,
  EuiSpacer,
  EuiSplitPanel,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState } from 'react';
import { i18nMessages } from '../../i18n';
import { ToolFormMode } from '../../tool_form';
import { McpHealthStatus } from '../../types/mcp';
import { McpEditableFields } from '../../components/mcp/mcp_editable_fields';
import { McpReadOnlyFields } from '../../components/mcp/mcp_readonly_fields';

const skeletonTextStyles = css`
  display: inline-block;
  width: 56px;
  vertical-align: middle;
`;

export interface McpConfigurationProps {
  mode: ToolFormMode;
}
export const McpConfiguration = ({ mode }: McpConfigurationProps) => {
  const [mcpHealthStatus, setMcpHealthStatus] = useState<McpHealthStatus>();

  const isCreatingTool = mode === ToolFormMode.Create;

  const ConfigurationFields = isCreatingTool ? McpEditableFields : McpReadOnlyFields;

  return (
    <>
      <EuiSpacer size="l" />
      <EuiSplitPanel.Outer hasBorder>
        <EuiSplitPanel.Inner
          css={({ euiTheme }) => css`
            padding-bottom: ${euiTheme.size.s};
          `}
        >
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiTitle size="xs">
              <h4>{i18nMessages.configuration.form.mcp.mcpToolDetailsTitle}</h4>
            </EuiTitle>
            {!isCreatingTool && (
              <EuiSkeletonLoading
                isLoading={!mcpHealthStatus}
                loadingContent={
                  <EuiHealth color="warning">
                    <EuiSkeletonText lines={1} size="s" css={skeletonTextStyles} />
                  </EuiHealth>
                }
                loadedContent={
                  <EuiHealth
                    color={mcpHealthStatus === McpHealthStatus.Healthy ? 'success' : 'danger'}
                  >
                    {mcpHealthStatus === McpHealthStatus.Healthy
                      ? i18nMessages.configuration.form.mcp.mcpHealthStatusHealthy
                      : i18nMessages.configuration.form.mcp.mcpHealthStatusError}
                  </EuiHealth>
                }
              />
            )}
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>
          <ConfigurationFields
            mcpHealthStatus={mcpHealthStatus}
            setMcpHealthStatus={setMcpHealthStatus}
          />
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </>
  );
};
