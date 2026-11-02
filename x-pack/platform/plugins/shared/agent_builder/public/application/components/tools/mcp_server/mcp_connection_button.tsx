/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPopover,
  EuiText,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiCopy,
  EuiContextMenuPanel,
} from '@elastic/eui';
import useToggle from 'react-use/lib/useToggle';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { MCP_SERVER_PATH } from '@kbn/agent-builder-common';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useIsUIAMEnabled } from '../../../hooks/use_is_uiam_enabled';
import { useKibanaUrl } from '../../../hooks/use_kibana_url';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';
import { labels } from '../../../utils/i18n';

export const McpConnectionButton = () => {
  const { createAgentBuilderUrl } = useNavigation();
  const { kibanaUrl } = useKibanaUrl();
  const { docLinksService } = useAgentBuilderServices();
  const isUIAMEnabled = useIsUIAMEnabled();
  const showMcpClientManagement = isUIAMEnabled;

  const [isContextOpen, toggleContextOpen] = useToggle(false);

  const mcpServerUrl = `${kibanaUrl}${MCP_SERVER_PATH}`;
  return (
    <EuiPopover
      aria-label={labels.tools.mcpServerConnectionButton}
      button={
        <EuiButtonEmpty
          key="mcp-server-connection-button"
          iconType="chevronSingleDown"
          iconSide="right"
          onClick={toggleContextOpen}
          data-test-subj="agentBuilderManageMcpButton"
          {...getEbtProps({
            element: AGENT_BUILDER_UI_EBT.element.pageContent,
            action: AGENT_BUILDER_UI_EBT.action.globalManagement.MANAGE_MCP,
            detail: AGENT_BUILDER_UI_EBT.entity.TOOL,
          })}
        >
          <EuiText size="s">{labels.tools.mcpServerConnectionButton}</EuiText>
        </EuiButtonEmpty>
      }
      isOpen={isContextOpen}
      closePopover={() => toggleContextOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel
        items={[
          <EuiCopy
            key="copy"
            textToCopy={mcpServerUrl}
            tooltipProps={{ anchorClassName: 'eui-fullWidth' }}
          >
            {(copy) => (
              <EuiContextMenuItem
                key="copy"
                icon="copy"
                onClick={copy}
                {...getEbtProps({
                  element: AGENT_BUILDER_UI_EBT.element.pageContent,
                  action: AGENT_BUILDER_UI_EBT.action.globalManagement.COPY_MCP_URL,
                  detail: AGENT_BUILDER_UI_EBT.entity.TOOL,
                })}
              >
                {labels.tools.copyMcpServerUrlButton}
              </EuiContextMenuItem>
            )}
          </EuiCopy>,
          <EuiContextMenuItem
            key="bulkImportMcpTools"
            icon="plus"
            href={createAgentBuilderUrl(appPaths.tools.bulkImportMcp)}
            data-test-subj="agentBuilderBulkImportMcpMenuItem"
            {...getEbtProps({
              element: AGENT_BUILDER_UI_EBT.element.pageContent,
              action: AGENT_BUILDER_UI_EBT.action.globalManagement.BULK_IMPORT_MCP,
              detail: AGENT_BUILDER_UI_EBT.entity.TOOL,
            })}
          >
            {labels.tools.bulkImportMcpToolsButton}
          </EuiContextMenuItem>,
          ...(showMcpClientManagement
            ? [
                <EuiContextMenuItem
                  key="manageMcpClients"
                  icon="gear"
                  href={createAgentBuilderUrl(appPaths.manage.mcpClients)}
                  data-test-subj="agentBuilderManageMcpClientsMenuItem"
                  {...getEbtProps({
                    element: AGENT_BUILDER_UI_EBT.element.pageContent,
                    action: AGENT_BUILDER_UI_EBT.action.globalManagement.MANAGE_MCP_CLIENTS,
                    detail: AGENT_BUILDER_UI_EBT.entity.TOOL,
                  })}
                >
                  {labels.tools.manageMcpClientsButton}
                </EuiContextMenuItem>,
              ]
            : []),
          <EuiContextMenuItem
            key="documentation"
            icon="documentation"
            href={docLinksService.mcpServer}
            target="_blank"
            {...getEbtProps({
              element: AGENT_BUILDER_UI_EBT.element.pageContent,
              action: AGENT_BUILDER_UI_EBT.action.globalManagement.MCP_DOCS,
              detail: AGENT_BUILDER_UI_EBT.entity.TOOL,
            })}
          >
            {labels.tools.aboutMcpServerDocumentationButton}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
