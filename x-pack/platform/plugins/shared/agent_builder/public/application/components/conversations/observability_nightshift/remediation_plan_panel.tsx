/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AiButton } from '@kbn/shared-ux-ai-components';

const REMEDIATION_STEP_COUNT = 4;

interface RemediationStep {
  id: string;
  label: string;
}

export const RemediationPlanPanel: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const panelRadiusCss = css`
    padding: 0;
    border-radius: ${euiTheme.border.radius.medium};
  `;

  const headerStripCss = css`
    background: ${euiTheme.colors.backgroundBaseSubdued};
    padding: ${euiTheme.size.m};
    border-bottom: ${euiTheme.border.thin};
  `;

  const titleRowCss = css`
    font-weight: ${euiTheme.font.weight.semiBold};
  `;

  const stepRowCss = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    border-bottom: ${euiTheme.border.thin};
    border-color: ${euiTheme.colors.borderBaseSubdued};
  `;

  const panelTitle = i18n.translate(
    'xpack.agentBuilder.observabilityNightshift.remediationPlan.title',
    {
      defaultMessage: 'Remediation plan',
    }
  );

  const summaryLead = i18n.translate(
    'xpack.agentBuilder.observabilityNightshift.remediationPlan.summaryLead',
    {
      defaultMessage: 'We recommend a ',
    }
  );

  const summaryEmphasis = i18n.translate(
    'xpack.agentBuilder.observabilityNightshift.remediationPlan.summaryEmphasis',
    {
      defaultMessage: '{stepCount} step remediation plan',
      values: { stepCount: REMEDIATION_STEP_COUNT },
    }
  );

  const summaryTrail = i18n.translate(
    'xpack.agentBuilder.observabilityNightshift.remediationPlan.summaryTrail',
    {
      defaultMessage: ' that requires confirmation.',
    }
  );

  const showDetailsLabel = i18n.translate(
    'xpack.agentBuilder.observabilityNightshift.remediationPlan.showDetails',
    {
      defaultMessage: 'Show details',
    }
  );

  const closeDetailsLabel = i18n.translate(
    'xpack.agentBuilder.observabilityNightshift.remediationPlan.closeDetails',
    {
      defaultMessage: 'Close details',
    }
  );

  const collapsedBody = i18n.translate(
    'xpack.agentBuilder.observabilityNightshift.remediationPlan.collapsedBody',
    {
      defaultMessage:
        'Start remediation with Elastic Agent Builder, and get insights about the root-cause.',
    }
  );

  const remediateInChatLabel = i18n.translate(
    'xpack.agentBuilder.observabilityNightshift.remediationPlan.remediateInChat',
    {
      defaultMessage: 'Remediate in Chat',
    }
  );

  const runInBackgroundLabel = i18n.translate(
    'xpack.agentBuilder.observabilityNightshift.remediationPlan.runInBackground',
    {
      defaultMessage: 'Run in background',
    }
  );

  const expandedFooterBody = i18n.translate(
    'xpack.agentBuilder.observabilityNightshift.remediationPlan.expandedFooterBody',
    {
      defaultMessage:
        'Remediation has started with Agent Builder, open the conversation to check the status.',
    }
  );

  const openConversationLabel = i18n.translate(
    'xpack.agentBuilder.observabilityNightshift.remediationPlan.openConversation',
    {
      defaultMessage: 'Open conversation',
    }
  );

  const stepMoreAria = i18n.translate(
    'xpack.agentBuilder.observabilityNightshift.remediationPlan.stepMoreActionsAria',
    {
      defaultMessage: 'More actions for this step',
    }
  );

  const steps: RemediationStep[] = useMemo(
    () => [
      {
        id: '1',
        label: i18n.translate(
          'xpack.agentBuilder.observabilityNightshift.remediationPlan.step1',
          {
            defaultMessage: 'Restart Cloud Run service',
          }
        ),
      },
      {
        id: '2',
        label: i18n.translate(
          'xpack.agentBuilder.observabilityNightshift.remediationPlan.step2',
          {
            defaultMessage: 'Review active critical alerts',
          }
        ),
      },
      {
        id: '3',
        label: i18n.translate(
          'xpack.agentBuilder.observabilityNightshift.remediationPlan.step3',
          {
            defaultMessage: 'Update Slack status and add root cause report',
          }
        ),
      },
      {
        id: '4',
        label: i18n.translate(
          'xpack.agentBuilder.observabilityNightshift.remediationPlan.step4',
          {
            defaultMessage: 'Jira incident ticket',
          }
        ),
      },
    ],
    []
  );

  const toggleDetails = useCallback(() => {
    setDetailsOpen((open) => !open);
  }, []);

  return (
    <EuiPanel hasBorder css={panelRadiusCss} data-test-subj="agentBuilderSigEventRemediationPlan">
      <div css={headerStripCss}>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="dashedCircle" size="m" color="subdued" aria-hidden />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" css={titleRowCss}>
                  {panelTitle}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {detailsOpen ? (
              <EuiButton size="s" onClick={toggleDetails}>
                {closeDetailsLabel}
              </EuiButton>
            ) : (
              <EuiButtonEmpty size="s" onClick={toggleDetails}>
                {showDetailsLabel}
              </EuiButtonEmpty>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="s" color="text">
          <p css={{ marginBottom: 0 }}>
            {summaryLead}
            <strong>{summaryEmphasis}</strong>
            {summaryTrail}
          </p>
        </EuiText>
      </div>

      {!detailsOpen ? (
        <div
          css={css`
            padding: ${euiTheme.size.m};
          `}
        >
          <EuiText size="s">
            <p>{collapsedBody}</p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="s" responsive={true} wrap>
            <EuiFlexItem grow={false}>
              <AiButton
                size="s"
                variant="base"
                iconType="productAgent"
                onClick={() => {
                  /* prototype */
                }}
              >
                {remediateInChatLabel}
              </AiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                display="empty"
                size="s"
                iconType="backgroundTask"
                color="primary"
                aria-label={runInBackgroundLabel}
                data-test-subj="agentBuilderSigEventRemediationRunInBackground"
                onClick={() => {
                  /* prototype */
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      ) : (
        <>
          {steps.map((step) => (
            <div key={step.id} css={stepRowCss}>
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="chevronSingleRight" size="s" color="subdued" aria-hidden />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="dashedCircle" size="s" color="subdued" aria-hidden />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs">
                        <span css={titleRowCss}>{step.label}</span>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="boxesVertical"
                    display="empty"
                    size="xs"
                    color="text"
                    aria-label={stepMoreAria}
                    data-test-subj={`agentBuilderSigEventRemediationStepMore-${step.id}`}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          ))}

          <div
            css={css`
              padding: ${euiTheme.size.m};
            `}
          >
            <EuiText size="s">
              <p>{expandedFooterBody}</p>
            </EuiText>
            <EuiSpacer size="m" />
            <AiButton
              size="s"
              variant="base"
              iconType="productAgent"
              onClick={() => {
                /* prototype */
              }}
              data-test-subj="agentBuilderSigEventRemediationOpenConversation"
            >
              {openConversationLabel}
            </AiButton>
          </div>
        </>
      )}
    </EuiPanel>
  );
};
