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
import { i18n } from '@kbn/i18n';
import useToggle from 'react-use/lib/useToggle';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useKibanaUrl } from '../../../hooks/use_kibana_url';
import { MCP_SERVER_PATH } from '../../../../../common/mcp';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';

export const McpConnectionButton = () => {
  const { createAgentBuilderUrl } = useNavigation();
  const { kibanaUrl } = useKibanaUrl();
  const { docLinksService } = useAgentBuilderServices();

  const [isContextOpen, toggleContextOpen] = useToggle(false);

  const mcpServerUrl = `${kibanaUrl}${MCP_SERVER_PATH}`;
  return (
    <EuiPopover
      button={
        <EuiButtonEmpty
          key="mcp-server-connection-button"
          iconType="arrowDown"
          iconSide="right"
          onClick={toggleContextOpen}
          data-test-subj="agentBuilderManageMcpButton"
        >
          <EuiText size="s">
            {i18n.translate('xpack.agentBuilder.tools.mcpServerConnectionButton', {
              defaultMessage: 'Manage MCP',
            })}
          </EuiText>
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
              <EuiContextMenuItem key="copy" icon="copy" onClick={copy}>
                {i18n.translate('xpack.agentBuilder.tools.copyMcpServerUrlButton', {
                  defaultMessage: 'Copy MCP Server URL',
                })}
              </EuiContextMenuItem>
            )}
          </EuiCopy>,
          <EuiContextMenuItem
            key="bulkImportMcpTools"
            icon="plus"
            href={createAgentBuilderUrl(appPaths.tools.bulkImportMcp)}
            data-test-subj="agentBuilderBulkImportMcpMenuItem"
          >
            {i18n.translate('xpack.agentBuilder.tools.bulkImportMcpToolsButton', {
              defaultMessage: 'Bulk import MCP tools',
            })}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="documentation"
            icon="documentation"
            href={docLinksService.mcpServer}
            target="_blank"
          >
            {i18n.translate('xpack.agentBuilder.tools.aboutMcpServerDocumentationButton', {
              defaultMessage: 'Documentation',
            })}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
