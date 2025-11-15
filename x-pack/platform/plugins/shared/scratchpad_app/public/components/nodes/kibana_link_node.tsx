/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Node } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import {
  EuiCard,
  EuiText,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiIcon,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ScratchpadNodeData } from '../../hooks/use_scratchpad_state';

interface KibanaLinkNodeData extends ScratchpadNodeData {
  type: 'kibana_link';
  url: string;
  title: string;
  description?: string;
  appId?: string;
}

interface KibanaLinkNodeProps {
  node: Node<KibanaLinkNodeData>;
}

export function KibanaLinkNode({ node }: KibanaLinkNodeProps) {
  const nodeData = node.data;
  const { euiTheme } = useEuiTheme();
  const { services } = useKibana();
  const isSelected = nodeData.selected || false;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(nodeData.url);
      services.notifications?.toasts.addSuccess({
        title: 'Link copied to clipboard',
        text: nodeData.url,
      });
    } catch (error) {
      services.notifications?.toasts.addDanger({
        title: 'Failed to copy link',
        text: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleNavigate = () => {
    if (!nodeData.url) return;
    
    try {
      // If it's a full URL, use navigateToUrl
      if (nodeData.url.startsWith('http://') || nodeData.url.startsWith('https://')) {
        services.application?.navigateToUrl(nodeData.url);
      } else if (nodeData.appId) {
        // Extract path from URL if it's a Kibana app URL
        const urlObj = new URL(nodeData.url, window.location.origin);
        const path = urlObj.pathname + urlObj.search + urlObj.hash;
        services.application?.navigateToApp(nodeData.appId, {
          path: path.startsWith('/') ? path : `/${path}`,
        });
      } else {
        // Fallback: try navigateToUrl
        services.application?.navigateToUrl(nodeData.url);
      }
    } catch (error) {
      services.notifications?.toasts.addDanger({
        title: 'Failed to navigate',
        text: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <EuiCard
        title={
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="link" />
            </EuiFlexItem>
            <EuiFlexItem>{String(nodeData.title || 'Link')}</EuiFlexItem>
          </EuiFlexGroup>
        }
        style={{
          minWidth: '250px',
          maxWidth: '350px',
          border: isSelected
            ? `2px solid ${euiTheme.colors.primary}`
            : `1px solid ${euiTheme.colors.plainDark}`,
          boxShadow: isSelected
            ? `0 0 0 2px ${euiTheme.colors.primary}20`
            : 'none',
        }}
        textAlign="left"
      >
        <EuiText size="s">
          {nodeData.description && (
            <div style={{ marginBottom: '8px' }}>{nodeData.description}</div>
          )}
          <div style={{ wordBreak: 'break-all', fontSize: '11px', color: euiTheme.colors.subduedText }}>
            {nodeData.url}
          </div>
        </EuiText>
        <EuiFlexGroup gutterSize="s" style={{ marginTop: '8px' }}>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="copy"
              onClick={handleCopyLink}
              title="Copy link to clipboard"
            >
              Copy
            </EuiButton>
          </EuiFlexItem>
          {nodeData.url && (
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                iconType="popout"
                onClick={handleNavigate}
                title="Navigate to link"
                fill
              >
                Open
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiCard>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

