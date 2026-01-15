/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiTextArea,
  EuiSwitch,
  EuiSpacer,
  EuiPanel,
  EuiLoadingSpinner,
  EuiBadge,
  useEuiTheme,
  EuiButtonEmpty,
  EuiButtonIcon,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useAgentOverrides } from '../../../context/agent_overrides/agent_overrides_context';
import { useAgentId } from '../../../hooks/use_conversation';
import { useAgentBuilderAgentById } from '../../../hooks/agents/use_agent_by_id';
import { useTools } from '../../../hooks/tools/use_tools';

interface AgentOverridesPanelProps {
  onClose: () => void;
}

export const AgentOverridesPanel: React.FC<AgentOverridesPanelProps> = ({ onClose }) => {
  const { euiTheme } = useEuiTheme();
  const agentId = useAgentId();
  const { agent, isLoading: isAgentLoading } = useAgentBuilderAgentById(agentId);
  const { tools, isLoading: isToolsLoading } = useTools();
  const { instructions, enabledToolIds, isDirty, setInstructions, toggleTool, resetOverrides } =
    useAgentOverrides();

  const headerStyles = css`
    padding: ${euiTheme.size.m};
    border-bottom: ${euiTheme.border.thin};
  `;

  const contentStyles = css`
    padding: ${euiTheme.size.m};
    overflow-y: auto;
    flex: 1;
  `;

  const sectionStyles = css`
    margin-bottom: ${euiTheme.size.l};
  `;

  const toolItemStyles = css`
    padding: ${euiTheme.size.s} 0;
    border-bottom: ${euiTheme.border.thin};
    &:last-child {
      border-bottom: none;
    }
  `;

  if (isAgentLoading) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" style={{ height: '100%' }}>
        <EuiLoadingSpinner size="l" />
      </EuiFlexGroup>
    );
  }

  if (!agent) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" style={{ height: '100%' }}>
        <EuiText color="subdued">No agent selected</EuiText>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="none" style={{ height: '100%' }}>
      <EuiFlexItem grow={false} css={headerStyles}>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h3>Edit current agent</h3>
                </EuiTitle>
              </EuiFlexItem>
              {isDirty && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="warning">Unsaved changes</EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              {isDirty && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty size="s" onClick={resetOverrides} iconType="refresh">
                    Reset
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  size="s"
                  onClick={onClose}
                  iconType="cross"
                  aria-label="Close panel"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow css={contentStyles}>
        {/* Instructions Section */}
        <div css={sectionStyles}>
          <EuiTitle size="xxs">
            <h4>Instructions</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiTextArea
            fullWidth
            rows={6}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Enter custom instructions for the agent..."
          />
        </div>

        {/* Tools Section */}
        <div css={sectionStyles}>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <h4>Tools</h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {enabledToolIds.size} of {tools.length} enabled
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          {isToolsLoading ? (
            <EuiLoadingSpinner size="m" />
          ) : (
            <EuiPanel paddingSize="s" hasBorder>
              {tools.map((tool) => (
                <div key={tool.id} css={toolItemStyles}>
                  <EuiFlexGroup alignItems="center" gutterSize="m">
                    <EuiFlexItem grow={false}>
                      <EuiSwitch
                        label={tool.id}
                        showLabel={false}
                        checked={enabledToolIds.has(tool.id)}
                        onChange={() => toggleTool(tool.id)}
                        compressed
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <strong>{tool.id}</strong>
                      </EuiText>
                      <EuiText size="xs" color="subdued">
                        {tool.description?.substring(0, 100)}
                        {tool.description && tool.description.length > 100 ? '...' : ''}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </div>
              ))}
            </EuiPanel>
          )}
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
