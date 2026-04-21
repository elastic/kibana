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
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { labels } from '../../../utils/i18n';

const { agentOverview: overviewLabels } = labels;

const CARD_BODY_BLOCK_SIZE = '275px';

const settingRowStyles = css`
  width: 100%;
`;
const instructionsContainerStyles = css`
  max-block-size: ${CARD_BODY_BLOCK_SIZE};
  overflow: auto;
`;
const instructionsTextStyles = css`
  white-space: pre-wrap;
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

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="m" alignItems="flexStart">
        {/* Custom Instructions Card */}
        <EuiFlexItem grow={1}>
          <EuiCard
            hasBorder
            display="plain"
            paddingSize="m"
            title={overviewLabels.customInstructionsTitle}
            titleElement="h3"
            titleSize="xs"
            description={overviewLabels.customInstructionsSubtitle}
            textAlign="left"
            onClick={canEditAgent ? onOpenEditFlyout : undefined}
            footer={
              !currentInstructions && canEditAgent ? (
                <EuiButtonEmpty
                  size="s"
                  flush="left"
                  data-test-subj="agentOverviewAddInstructionsLink"
                >
                  {overviewLabels.addInstructionsLink}
                </EuiButtonEmpty>
              ) : undefined
            }
            css={css`
              height: 100%;
              .euiCard__content p {
                color: ${euiTheme.colors.textSubdued};
              }
            `}
          >
            {currentInstructions && (
              <>
                <EuiSpacer size="l" />
                <div css={instructionsContainerStyles}>
                  <EuiText size="s" color="subdued">
                    <p css={instructionsTextStyles}>{currentInstructions}</p>
                  </EuiText>
                </div>
              </>
            )}
          </EuiCard>
        </EuiFlexItem>

        {/* Agent Settings Card */}
        <EuiFlexItem grow={1}>
          <EuiCard
            hasBorder
            display="plain"
            paddingSize="m"
            title={overviewLabels.agentSettingsCardTitle}
            titleElement="h3"
            titleSize="xs"
            description={overviewLabels.agentSettingsCardSubtitle}
            textAlign="left"
            onClick={canEditAgent ? onOpenEditFlyout : undefined}
            css={css`
              height: 100%;
              .euiCard__content p {
                color: ${euiTheme.colors.textSubdued};
              }
            `}
          >
            <EuiSpacer size="l" />
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
                          color={
                            enableElasticCapabilities ? 'textPrimary' : euiTheme.colors.textDisabled
                          }
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
                            <EuiText
                              size="s"
                              color={hasWorkflows ? 'textPrimary' : euiTheme.colors.textDisabled}
                            >
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
          </EuiCard>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
