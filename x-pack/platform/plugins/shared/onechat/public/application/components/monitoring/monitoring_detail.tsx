/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiAccordion,
  EuiBadge,
  EuiStat,
  EuiTimeline,
  EuiTimelineItem,
  EuiMarkdownFormat,
  EuiLink,
  EuiAvatar,
  useEuiTheme,
} from '@elastic/eui';
import { Chart, Settings, BarSeries, Axis, Tooltip } from '@elastic/charts';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { ConversationRound, ToolCallStep } from '@kbn/onechat-common';
import { useMonitoringGetConversation } from '../../hooks/monitoring';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../utils/app_paths';
import { labels } from '../../utils/i18n';
import { TechPreviewTitle } from '../common/tech_preview';

export const MonitoringDetail: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { createOnechatUrl } = useNavigation();
  const { euiTheme } = useEuiTheme();

  const {
    conversation,
    isLoading: loading,
    error: queryError,
  } = useMonitoringGetConversation(conversationId);

  const error = queryError ? labels.monitoring.loadConversationErrorMessage : null;

  const renderToolCalls = (round: ConversationRound) => {
    const toolCallSteps = round.steps.filter(
      (step): step is ToolCallStep => step.type === 'tool_call'
    );

    if (toolCallSteps.length === 0) {
      return null;
    }

    return (
      <>
        <EuiSpacer size="m" />
        <EuiTitle size="xs">
          <h4>{labels.monitoring.toolExecutionLabel}</h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiTimeline aria-label="Tool executions">
          {toolCallSteps.map((toolCall, idx) => (
            <EuiTimelineItem key={`tool-${idx}`} icon="wrench" verticalAlign="top">
              <EuiPanel hasBorder paddingSize="m">
                <EuiText size="s">
                  <EuiLink
                    href={createOnechatUrl(appPaths.tools.details({ toolId: toolCall.tool_id }))}
                  >
                    {toolCall.tool_id}
                  </EuiLink>
                </EuiText>
                <EuiSpacer size="s" />
                <EuiAccordion
                  id={`tool-params-${idx}`}
                  buttonContent={labels.monitoring.inputParametersLabel}
                  paddingSize="s"
                >
                  <EuiCodeBlock language="json" isCopyable paddingSize="s">
                    {JSON.stringify(toolCall.params, null, 2)}
                  </EuiCodeBlock>
                </EuiAccordion>
                <EuiSpacer size="s" />
                <EuiAccordion
                  id={`tool-results-${idx}`}
                  buttonContent={labels.monitoring.outputResultLabel}
                  paddingSize="s"
                >
                  <EuiCodeBlock language="json" isCopyable paddingSize="s">
                    {JSON.stringify(toolCall.results, null, 2)}
                  </EuiCodeBlock>
                </EuiAccordion>
              </EuiPanel>
            </EuiTimelineItem>
          ))}
        </EuiTimeline>
      </>
    );
  };

  const renderRound = (round: ConversationRound, index: number) => {
    const timeToFirstTokenSec = (round.time_to_first_token / 1000).toFixed(2);
    const totalTimeSec = (round.time_to_last_token / 1000).toFixed(2);
    const generationTimeSec = (
      (round.time_to_last_token - round.time_to_first_token) /
      1000
    ).toFixed(2);

    return (
      <EuiTimelineItem key={round.id} icon="dot" verticalAlign="top">
        <EuiPanel hasBorder paddingSize="l">
          <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {moment(round.started_at).format('HH:mm:ss')}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiPanel hasBorder paddingSize="m" color="subdued">
            <EuiFlexGroup direction="row" gutterSize="xs">
              <EuiFlexItem>
                <EuiFlexGroup justifyContent="flexStart" alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {labels.monitoring.connectorLabel}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">{round.model_usage.connector_id}</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup justifyContent="flexStart" alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {labels.monitoring.inputTokensLabel}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="primary">
                      {round.model_usage.input_tokens.toLocaleString()}
                    </EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup justifyContent="flexStart" alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {labels.monitoring.outputTokensLabel}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="success">
                      {round.model_usage.output_tokens.toLocaleString()}
                    </EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>

          <EuiSpacer size="m" />

          {/* User Input */}
          <EuiTitle size="xs">
            <h4>{labels.monitoring.userInputLabel}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiPanel hasBorder paddingSize="m" color="subdued">
            <EuiText size="s">{round.input.message}</EuiText>
          </EuiPanel>

          {/* Tool Calls */}
          {renderToolCalls(round)}

          {/* Agent Response */}
          <EuiSpacer size="m" />
          <EuiTitle size="xs">
            <h4>{labels.monitoring.agentResponseLabel}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiPanel hasBorder paddingSize="m" color="subdued">
            <EuiText size="s">
              <EuiMarkdownFormat textSize="s">{round.response.message}</EuiMarkdownFormat>
            </EuiText>
          </EuiPanel>

          {/* Timing Chart */}
          <EuiSpacer size="m" />
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xxs">
              <h5>{labels.monitoring.timingBreakdownLabel}</h5>
            </EuiTitle>
            <EuiSpacer size="s" />
            <Chart size={{ height: 60 }}>
              <Settings rotation={90} showLegend={false} />
              <Tooltip type="follow" />
              <BarSeries
                id="time-to-first-token"
                name={labels.monitoring.timeToFirstTokenLabel}
                data={[{ x: 'timing', y: round.time_to_first_token / 1000 }]}
                xAccessor="x"
                yAccessors={['y']}
                stackAccessors={['x']}
                color={euiTheme.colors.vis.euiColorVis1}
              />
              <BarSeries
                id="generation-time"
                name={labels.monitoring.generationTimeLabel}
                data={[
                  {
                    x: 'timing',
                    y: (round.time_to_last_token - round.time_to_first_token) / 1000,
                  },
                ]}
                xAccessor="x"
                yAccessors={['y']}
                stackAccessors={['x']}
                color={euiTheme.colors.vis.euiColorVis0}
              />
              <Axis
                id="bottom"
                position="bottom"
                gridLine={{ visible: true }}
                tickFormat={(d) => `${d.toFixed(2)}s`}
              />
            </Chart>
            <EuiSpacer size="s" />
            <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" wrap>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: euiTheme.colors.vis.euiColorVis1,
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {labels.monitoring.timeToFirstTokenLabel}: {timeToFirstTokenSec}s
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: euiTheme.colors.vis.euiColorVis0,
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {labels.monitoring.generationTimeLabel}: {generationTimeSec}s
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <strong>Total: {totalTimeSec}s</strong>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiPanel>
      </EuiTimelineItem>
    );
  };

  const headerStyles = css`
    background-color: ${euiTheme.colors.backgroundBasePlain};
    border-block-end: none;
  `;

  if (loading) {
    return (
      <KibanaPageTemplate data-test-subj="agentBuilderMonitoringDetailPage">
        <KibanaPageTemplate.Header
          css={headerStyles}
          pageTitle={<TechPreviewTitle title={labels.monitoring.detailTitle} />}
        />
        <KibanaPageTemplate.Section>
          <EuiPanel hasBorder>
            <EuiText textAlign="center" color="subdued">
              {i18n.translate('xpack.onechat.monitoring.loadingMessage', {
                defaultMessage: 'Loading conversation...',
              })}
            </EuiText>
          </EuiPanel>
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    );
  }

  if (error || !conversation) {
    return (
      <KibanaPageTemplate data-test-subj="agentBuilderMonitoringDetailPage">
        <KibanaPageTemplate.Header
          css={headerStyles}
          pageTitle={<TechPreviewTitle title={labels.monitoring.detailTitle} />}
          rightSideItems={[
            <EuiButtonEmpty
              key="back-button"
              iconType="arrowLeft"
              href={createOnechatUrl(appPaths.monitoring.list)}
            >
              {labels.monitoring.backToListLabel}
            </EuiButtonEmpty>,
          ]}
        />
        <KibanaPageTemplate.Section>
          <EuiCallOut
            title={
              error ||
              i18n.translate('xpack.onechat.monitoring.conversationNotFound', {
                defaultMessage: 'Conversation not found',
              })
            }
            color="danger"
            iconType="error"
          />
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    );
  }

  const { monitoring_metadata: metadata } = conversation;
  const totalTokensIn = metadata.total_tokens_in;
  const totalTokensOut = metadata.total_tokens_out;

  return (
    <KibanaPageTemplate data-test-subj="agentBuilderMonitoringDetailPage">
      <KibanaPageTemplate.Header
        css={headerStyles}
        pageTitle={<TechPreviewTitle title={labels.monitoring.detailTitle} />}
        rightSideItems={[
          <EuiButtonEmpty
            key="back-button"
            iconType="arrowLeft"
            href={createOnechatUrl(appPaths.monitoring.list)}
          >
            {labels.monitoring.backToListLabel}
          </EuiButtonEmpty>,
        ]}
      />
      <KibanaPageTemplate.Section>
        {/* Title and Author Stats */}
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiStat
                title={conversation.title || conversation.id}
                description={labels.monitoring.conversationLabel}
                titleSize="s"
                textAlign="left"
              />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiStat
                title={
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiAvatar
                        name={conversation.user.username || conversation.user.id}
                        size="s"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      {conversation.user.username || conversation.user.id}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                description={labels.monitoring.authorLabel}
                titleSize="s"
                textAlign="left"
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        {/* Summary Stats */}
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiStat
                title={totalTokensIn.toLocaleString()}
                description={labels.monitoring.inputTokensLabel}
                titleSize="s"
              />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiStat
                title={totalTokensOut.toLocaleString()}
                description={labels.monitoring.outputTokensLabel}
                titleSize="s"
              />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiStat
                title={conversation.rounds.length}
                description={labels.monitoring.roundsLabel}
                titleSize="s"
              />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiStat
                title={metadata.total_tool_calls}
                description={labels.monitoring.totalToolCalls}
                titleSize="s"
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        {/* Connector Usage Breakdown */}
        {metadata.connector_ids.length > 1 && (
          <>
            <EuiPanel hasBorder paddingSize="l">
              <EuiTitle size="xs">
                <h3>{labels.monitoring.connectorUsageLabel}</h3>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiFlexGroup gutterSize="m" wrap>
                {Object.entries(metadata.connector_usage).map(([connectorId, usage]) => (
                  <EuiFlexItem key={connectorId} grow={false}>
                    <EuiPanel color="subdued" paddingSize="m">
                      <EuiBadge color="hollow">{connectorId}</EuiBadge>
                      <EuiSpacer size="s" />
                      <EuiText size="xs" color="subdued">
                        <div>
                          <strong>{labels.monitoring.tokensInLabel}:</strong>{' '}
                          {usage.tokens_in.toLocaleString()}
                        </div>
                        <div>
                          <strong>{labels.monitoring.tokensOutLabel}:</strong>{' '}
                          {usage.tokens_out.toLocaleString()}
                        </div>
                      </EuiText>
                    </EuiPanel>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiPanel>
            <EuiSpacer size="l" />
          </>
        )}

        <EuiTimeline aria-label="Conversation rounds">
          {conversation.rounds.map((round, index) => renderRound(round, index))}
        </EuiTimeline>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
