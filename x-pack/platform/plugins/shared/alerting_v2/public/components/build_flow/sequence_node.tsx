/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiIcon, euiShadow, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { Node, NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';

export interface SequenceNodeData extends Record<string, unknown> {
  ruleId: string;
  ruleName: string;
  stageIndex: number;
  onRemove: (ruleId: string) => void;
}

export type SequenceNodeType = Node<SequenceNodeData, 'sequenceStage'>;

const componentStyles = {
  node: (euiThemeContext: { euiTheme: ReturnType<typeof useEuiTheme>['euiTheme'] }) => css`
    width: 100%;
    height: 100%;
    background-color: ${euiThemeContext.euiTheme.colors.backgroundBasePlain};
    border: 1px solid ${euiThemeContext.euiTheme.colors.borderBaseFloating};
    border-radius: 8px;
    padding: 8px 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    ${euiShadow(euiThemeContext as Parameters<typeof euiShadow>[0], 'xs', { direction: 'down' })}
  `,
};

export const SequenceNode: React.FC<NodeProps<SequenceNodeType>> = ({ data }) => {
  const euiThemeContext = useEuiTheme();
  const styles = useMemoCss(componentStyles);

  return (
    <EuiFlexGroup css={{ width: '100%', height: '100%' }} gutterSize="none">
      <Handle type="target" position={Position.Left} style={{ visibility: data.stageIndex === 0 ? 'hidden' : 'visible' }} />
      <EuiFlexItem css={styles.node}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <div
              css={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 'bold',
                color: euiThemeContext.euiTheme.colors.emptyShade,
                backgroundColor: euiThemeContext.euiTheme.colors.primary,
                flexShrink: 0,
              }}
            >
              {data.stageIndex + 1}
            </div>
          </EuiFlexItem>
          <EuiFlexItem css={{ minWidth: 0 }}>
            <div
              css={{
                fontSize: '13px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={data.ruleName}
            >
              {data.ruleName}
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              size="xs"
              color="text"
              aria-label={`Remove ${data.ruleName} from sequence`}
              onClick={() => data.onRemove(data.ruleId)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <Handle type="source" position={Position.Right} />
    </EuiFlexGroup>
  );
};

export const SEQUENCE_DRAG_MIME_TYPE = 'application/x-alerting-v2-rule';

export const DraggableRulePreviewIcon = () => <EuiIcon type="grabHorizontal" color="subdued" />;
