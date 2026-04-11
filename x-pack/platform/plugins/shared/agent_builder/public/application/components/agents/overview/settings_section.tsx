/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { labels } from '../../../utils/i18n';

const { agentOverview: overviewLabels } = labels;

const cardStyles = css`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 40px;
  align-items: flex-start;
`;

const settingRowStyles = css`
  width: 100%;
`;

export interface SettingsSectionProps {
  enableElasticCapabilities: boolean;
  currentInstructions: string;
  showWorkflowSection: boolean;
  workflowIds: string[];
  canEditAgent: boolean;
  onOpenEditFlyout: () => void;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  enableElasticCapabilities,
  currentInstructions,
  showWorkflowSection,
  workflowIds,
  canEditAgent,
  onOpenEditFlyout,
}) => {
  const { euiTheme } = useEuiTheme();

  const textDisabledStyles = css`
    color: ${euiTheme.colors.textDisabled};
  `;

  const hasWorkflows = workflowIds.length > 0;

  return (
    <>
      <EuiTitle size="s">
        <h2>{overviewLabels.customizationsTitle}</h2>
      </EuiTitle>

      <EuiSpacer size="l" />

      <EuiFlexGroup gutterSize="m" alignItems="stretch">
        {/* Custom Instructions Card */}
        <EuiFlexItem grow={1}>
          <EuiPanel hasBorder paddingSize="l" css={cardStyles}>
            <div>
              <EuiTitle size="xs">
                <h3>{overviewLabels.customInstructionsTitle}</h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                {currentInstructions || overviewLabels.customInstructionsOnboardingText}
              </EuiText>
            </div>
            {!currentInstructions && canEditAgent ? (
              <EuiButtonEmpty
                size="s"
                flush="left"
                onClick={onOpenEditFlyout}
                data-test-subj="agentOverviewAddInstructionsLink"
              >
                {overviewLabels.addInstructionsLink}
              </EuiButtonEmpty>
            ) : null}
          </EuiPanel>
        </EuiFlexItem>

        {/* Agent Settings Card */}
        <EuiFlexItem grow={1}>
          <EuiPanel hasBorder paddingSize="l" css={cardStyles}>
            <div css={settingRowStyles}>
              <EuiTitle size="xs">
                <h3>{overviewLabels.agentSettingsCardTitle}</h3>
              </EuiTitle>
              <EuiSpacer size="xs" />
              <EuiText size="s" color="subdued">
                {overviewLabels.agentSettingsCardSubtitle}
              </EuiText>
            </div>
            <EuiFlexGroup
              direction="column"
              gutterSize="s"
              responsive={false}
              css={settingRowStyles}
            >
              {/* Include built-in capabilities row */}
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow>
                    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiText
                          color={enableElasticCapabilities ? 'textPrimary' : 'subdued'}
                          size="s"
                        >
                          {overviewLabels.autoIncludeTitle}
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem
                        grow={false}
                        css={enableElasticCapabilities ? undefined : textDisabledStyles}
                      >
                        <EuiIcon type="info" size="s" aria-hidden={true} />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {enableElasticCapabilities ? (
                      <EuiBadge color="success" data-test-subj="agentOverviewAutoIncludeBadge">
                        {overviewLabels.enabledBadge}
                      </EuiBadge>
                    ) : (
                      <EuiBadge color="default" data-test-subj="agentOverviewAutoIncludeBadge">
                        {overviewLabels.notSetBadge}
                      </EuiBadge>
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>

              {/* Pre-execution workflows row */}
              {showWorkflowSection && (
                <>
                  <EuiHorizontalRule margin="none" />

                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem grow>
                        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <EuiText size="s" color={hasWorkflows ? 'textPrimary' : 'subdued'}>
                              {overviewLabels.preExecutionWorkflowTitle}
                            </EuiText>
                          </EuiFlexItem>
                          <EuiFlexItem
                            grow={false}
                            css={hasWorkflows ? undefined : textDisabledStyles}
                          >
                            <EuiIcon type="info" size="s" aria-hidden={true} />
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiBadge
                          color={hasWorkflows ? 'success' : 'default'}
                          data-test-subj="agentOverviewWorkflowsBadge"
                        >
                          {hasWorkflows ? overviewLabels.enabledBadge : overviewLabels.notSetBadge}
                        </EuiBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </>
              )}
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
