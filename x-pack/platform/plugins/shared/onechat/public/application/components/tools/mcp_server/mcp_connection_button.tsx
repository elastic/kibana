/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiPopover,
  EuiText,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiCopy,
  EuiContextMenuPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { docLinks } from '../../../../../common/doc_links';
import { useKibanaUrl } from '../../../hooks/use_kibana_url';
import { MCP_SERVER_PATH } from '../../../../../common/mcp';

export const McpConnectionButton = () => {
  const [isContextOpen, setIsContextOpen] = useState(false);

  const { kibanaUrl } = useKibanaUrl();

  const mcpServerUrl = `${kibanaUrl}${MCP_SERVER_PATH}`;

  return (
    <EuiPopover
      button={
        <EuiButtonEmpty
          key="mcp-server-connection-button"
          iconType="arrowDown"
          onClick={() => setIsContextOpen(true)}
        >
          <EuiText size="s">
            {i18n.translate('xpack.onechat.tools.mcpServerConnectionButton', {
              defaultMessage: 'MCP Server',
            })}
          </EuiText>
        </EuiButtonEmpty>
      }
      isOpen={isContextOpen}
      closePopover={() => setIsContextOpen(false)}
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
                {i18n.translate('xpack.onechat.tools.copyMcpServerUrlButton', {
                  defaultMessage: 'Copy MCP Server URL',
                })}
              </EuiContextMenuItem>
            )}
          </EuiCopy>,

          <EuiContextMenuItem key="documentation" href={docLinks.mcpServer} target="_blank">
            {i18n.translate('xpack.onechat.tools.aboutMcpServerDocumentationButton', {
              defaultMessage: 'Documentation',
            })}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
