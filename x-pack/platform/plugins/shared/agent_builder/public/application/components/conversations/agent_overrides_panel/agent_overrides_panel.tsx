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
  useEuiScrollBar,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useAgentOverrides } from '../../../context/agent_overrides/agent_overrides_context';
import { useAgentId } from '../../../hooks/use_conversation';
import { useAgentBuilderAgentById } from '../../../hooks/agents/use_agent_by_id';
import { useTools } from '../../../hooks/tools/use_tools';

const PANEL_MAX_HEIGHT = 400;

const panelTitle = i18n.translate('xpack.agentBuilder.agentOverridesPanel.title', {
  defaultMessage: 'Modify agent',
});

const unsavedBadgeLabel = i18n.translate('xpack.agentBuilder.agentOverridesPanel.unsavedBadge', {
  defaultMessage: 'Modified',
});

const resetButtonLabel = i18n.translate('xpack.agentBuilder.agentOverridesPanel.resetButton', {
  defaultMessage: 'Reset',
});

const closePanelAriaLabel = i18n.translate(
  'xpack.agentBuilder.agentOverridesPanel.closeAriaLabel',
  { defaultMessage: 'Close panel' }
);

const instructionsTitle = i18n.translate(
  'xpack.agentBuilder.agentOverridesPanel.instructionsTitle',
  { defaultMessage: 'Instructions' }
);

const instructionsPlaceholder = i18n.translate(
  'xpack.agentBuilder.agentOverridesPanel.instructionsPlaceholder',
  { defaultMessage: 'Enter custom instructions for the agent...' }
);

const toolsTitle = i18n.translate('xpack.agentBuilder.agentOverridesPanel.toolsTitle', {
  defaultMessage: 'Tools',
});

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

  const floatingWrapperStyles = css`
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    margin-bottom: ${euiTheme.size.s};
    z-index: 3;
    padding: 0 16px;
  `;

  const panelContentStyles = css`
    max-height: ${PANEL_MAX_HEIGHT}px;
    ${useEuiScrollBar()}
    overflow-y: auto;
  `;

  const sectionStyles = css`
    margin-bottom: ${euiTheme.size.m};
    &:last-child {
      margin-bottom: 0;
    }
  `;

  const toolItemStyles = css`
    padding: ${euiTheme.size.xs} 0;
    border-bottom: ${euiTheme.border.thin};
    &:last-child {
      border-bottom: none;
    }
  `;

  const toolsEnabledLabel = i18n.translate('xpack.agentBuilder.agentOverridesPanel.toolsEnabled', {
    defaultMessage: '{enabled} of {total} enabled',
    values: { enabled: enabledToolIds.size, total: tools.length },
  });

  if (isAgentLoading) {
    return (
      <div css={floatingWrapperStyles}>
        <EuiPanel hasShadow hasBorder paddingSize="m">
          <EuiFlexGroup alignItems="center" justifyContent="center">
            <EuiLoadingSpinner size="l" />
          </EuiFlexGroup>
        </EuiPanel>
      </div>
    );
  }

  if (!agent) {
    return (
      <div css={floatingWrapperStyles}>
        <EuiPanel hasShadow hasBorder paddingSize="m">
          <EuiText color="subdued" textAlign="center">
            {i18n.translate('xpack.agentBuilder.agentOverridesPanel.noAgent', {
              defaultMessage: 'No agent selected',
            })}
          </EuiText>
        </EuiPanel>
      </div>
    );
  }

  return (
    <div css={floatingWrapperStyles} data-test-subj="agentOverridesPanel">
      <EuiPanel hasShadow hasBorder paddingSize="m">
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs">
                  <h3>{panelTitle}</h3>
                </EuiTitle>
              </EuiFlexItem>
              {isDirty && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{unsavedBadgeLabel}</EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              {isDirty && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty size="xs" onClick={resetOverrides} iconType="refresh">
                    {resetButtonLabel}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  size="xs"
                  onClick={onClose}
                  iconType="cross"
                  aria-label={closePanelAriaLabel}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        <div css={panelContentStyles}>
          <div css={sectionStyles}>
            <EuiTitle size="xxs">
              <h4>{instructionsTitle}</h4>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiTextArea
              fullWidth
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={instructionsPlaceholder}
              compressed
            />
          </div>

          <div css={sectionStyles}>
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs">
                  <h4>{toolsTitle}</h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {toolsEnabledLabel}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            {isToolsLoading ? (
              <EuiLoadingSpinner size="m" />
            ) : (
              <EuiPanel paddingSize="s" hasBorder color="subdued">
                {tools.map((tool) => (
                  <div key={tool.id} css={toolItemStyles}>
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
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
                        <EuiText size="xs">
                          <strong>{tool.id}</strong>
                        </EuiText>
                        {tool.description && (
                          <EuiText size="xs" color="subdued">
                            {tool.description.length > 80
                              ? `${tool.description.substring(0, 80)}...`
                              : tool.description}
                          </EuiText>
                        )}
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </div>
                ))}
              </EuiPanel>
            )}
          </div>
        </div>
      </EuiPanel>
    </div>
  );
};
