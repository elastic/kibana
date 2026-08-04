/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  euiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Node, NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { RULE_DRAG_MIME_TYPE } from './form_types';

const RULE_ROW_HEIGHT = 24;
const OPERATOR_ROW_HEIGHT = 28;
const NODE_PADDING_Y = 16;

export const getNodeHeight = (rulesCount: number): number => {
  if (rulesCount <= 1) return 48;
  return NODE_PADDING_Y + rulesCount * RULE_ROW_HEIGHT + OPERATOR_ROW_HEIGHT;
};

export interface SequenceNodeData extends Record<string, unknown> {
  stepId: string;
  rules: Array<{ ruleId: string; ruleName: string }>;
  operator: 'and' | 'or';
  stageIndex: number;
  onRemoveRule: (stepId: string, ruleId: string) => void;
  onOperatorChange: (stepId: string, op: 'and' | 'or') => void;
  onDropRule: (
    stepId: string,
    payload: { id: string; name: string; groupingFields: string[]; kind: 'alert' | 'signal' }
  ) => void;
  interactive?: boolean;
}

export type SequenceNodeType = Node<SequenceNodeData, 'sequenceStage'>;

const OPERATOR_OPTIONS = [
  {
    id: 'or',
    label: i18n.translate('xpack.alertingV2.sequenceBuilder.node.operatorOr', {
      defaultMessage: 'OR',
    }),
  },
  {
    id: 'and',
    label: i18n.translate('xpack.alertingV2.sequenceBuilder.node.operatorAnd', {
      defaultMessage: 'AND',
    }),
  },
];

export const SequenceNode: React.FC<NodeProps<SequenceNodeType>> = ({ data }) => {
  const euiThemeCtx = useEuiTheme();
  const { euiTheme } = euiThemeCtx;
  const [isDragOver, setIsDragOver] = useState(false);

  const nodeCss = useMemo(
    () => css`
      width: 100%;
      height: 100%;
      background-color: ${euiTheme.colors.backgroundBasePlain};
      border: 1px solid ${isDragOver ? euiTheme.colors.primary : euiTheme.colors.borderBaseFloating};
      border-radius: 8px;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 2px;
      ${euiShadow(euiThemeCtx as Parameters<typeof euiShadow>[0], 'xs', { direction: 'down' })}
      ${isDragOver ? `box-shadow: 0 0 0 2px ${euiTheme.colors.primary}33;` : ''}
    `,
    [euiTheme, euiThemeCtx, isDragOver]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!data.interactive) return;
    if (!e.dataTransfer.types.includes(RULE_DRAG_MIME_TYPE)) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!data.interactive) return;
    setIsDragOver(false);
    const raw = e.dataTransfer.getData(RULE_DRAG_MIME_TYPE);
    if (!raw) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      const payload = JSON.parse(raw) as {
        id: string;
        name: string;
        groupingFields: string[];
        kind: 'alert' | 'signal';
      };
      data.onDropRule(data.stepId, payload);
    } catch {
      /* noop */
    }
  };

  const isMultiRule = data.rules.length > 1;
  const isInteractive = data.interactive !== false;

  return (
    <EuiFlexGroup css={{ width: '100%', height: '100%' }} gutterSize="none">
      <Handle
        type="target"
        position={Position.Left}
        style={{ visibility: data.stageIndex === 0 ? 'hidden' : 'visible' }}
      />

      <EuiFlexItem
        css={nodeCss}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
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
                color: euiTheme.colors.emptyShade,
                backgroundColor: euiTheme.colors.primary,
                flexShrink: 0,
              }}
            >
              {data.stageIndex + 1}
            </div>
          </EuiFlexItem>

          <EuiFlexItem css={{ minWidth: 0 }}>
            {data.rules.map((rule) => (
              <EuiFlexGroup
                key={rule.ruleId}
                alignItems="center"
                gutterSize="xs"
                responsive={false}
              >
                <EuiFlexItem css={{ minWidth: 0 }}>
                  <div
                    css={{
                      fontSize: '13px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: `${RULE_ROW_HEIGHT}px`,
                    }}
                    title={rule.ruleName}
                  >
                    {rule.ruleName}
                  </div>
                </EuiFlexItem>
                {isInteractive && (
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={i18n.translate('xpack.alertingV2.sequenceBuilder.node.removeRule', {
                        defaultMessage: 'Remove {name} from step',
                        values: { name: rule.ruleName },
                      })}
                      disableScreenReaderOutput
                    >
                      <EuiButtonIcon
                        iconType="cross"
                        size="xs"
                        color="text"
                        aria-label={i18n.translate(
                          'xpack.alertingV2.sequenceBuilder.node.removeRule',
                          {
                            defaultMessage: 'Remove {name} from step',
                            values: { name: rule.ruleName },
                          }
                        )}
                        onClick={() => data.onRemoveRule(data.stepId, rule.ruleId)}
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            ))}
          </EuiFlexItem>
        </EuiFlexGroup>

        {isMultiRule && (
          <div css={{ marginTop: '4px' }}>
            {isInteractive ? (
              <EuiButtonGroup
                legend={i18n.translate('xpack.alertingV2.sequenceBuilder.node.operatorLegend', {
                  defaultMessage: 'Step match condition',
                })}
                options={OPERATOR_OPTIONS}
                idSelected={data.operator}
                onChange={(id) => data.onOperatorChange(data.stepId, id as 'and' | 'or')}
                buttonSize="compressed"
                isFullWidth
              />
            ) : (
              <EuiText size="xs" color="subdued" textAlign="center">
                {data.operator.toUpperCase()}
              </EuiText>
            )}
          </div>
        )}
      </EuiFlexItem>

      <Handle type="source" position={Position.Right} />
    </EuiFlexGroup>
  );
};
