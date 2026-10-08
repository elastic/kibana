/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect, useRef, type ReactNode } from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiMarkdownFormat,
  EuiSkeletonText,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AiButton, AiIcon } from '@kbn/ui-ai-components';
import {
  AI_INSIGHTS_GENERATION_MODE,
  AI_INSIGHTS_HEIGHT_MODE,
  AI_INSIGHTS_STATUS,
} from '../../common/ai_insights/constants';
import type {
  AiInsightsGenerationMode,
  AiInsightsHeightMode,
  AiInsightsResult,
  AiInsightsStatus,
} from '../../common/ai_insights/types';
import { measureIntrinsicHeight } from './resize_panel_height';
import { AI_INSIGHTS_STATUS_HEADLINE } from './status_copy';

const STATUS_BADGE_COLOR: Record<AiInsightsStatus, 'success' | 'warning' | 'danger'> = {
  [AI_INSIGHTS_STATUS.green]: 'success',
  [AI_INSIGHTS_STATUS.yellow]: 'warning',
  [AI_INSIGHTS_STATUS.red]: 'danger',
};

const StatusBadge: React.FC<{
  status: AiInsightsStatus;
  testSubj?: string;
  onClick?: () => void;
}> = ({ status, testSubj = 'aiInsightsCollapsedStatus', onClick }) => (
  <EuiBadge
    color={STATUS_BADGE_COLOR[status]}
    data-test-subj={testSubj}
    onClick={onClick}
    onClickAriaLabel={
      onClick
        ? i18n.translate('xpack.agentBuilderDashboards.aiInsights.toggleFromBadge', {
            defaultMessage: 'Toggle AI Insights panel',
          })
        : undefined
    }
    css={css`
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
    `}
  >
    {AI_INSIGHTS_STATUS_HEADLINE[status]}
  </EuiBadge>
);

export interface AiInsightsPanelProps {
  insight: AiInsightsResult | undefined;
  isLoading: boolean;
  hasConnectors: boolean;
  /** True when a connector id is selected (or auto-picked) for generation. */
  hasSelectedConnector: boolean;
  isConnectorsLoading: boolean;
  generationMode: AiInsightsGenerationMode;
  /** Auto-fit grid height to content, or fill a fixed cell and scroll. */
  heightMode?: AiInsightsHeightMode;
  isStale: boolean;
  /** When false, only the compact status header is shown and the dashboard panel is short. */
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  /** Reports intrinsic content height so the dashboard grid can hug the panel. */
  onContentHeightChange?: (heightPx: number) => void;
  onSetupConnector: () => void;
  onOpenSettings: () => void;
  onGenerate: () => void;
  onUpdate: () => void;
}

const AiInsightsShell: React.FC<{
  /** When true, fill the panel cell and scroll overflow instead of hugging height. */
  fillAndScroll?: boolean;
  /** Compact collapsed strip: fill the cell and vertically center the header. */
  collapsed?: boolean;
  onContentHeightChange?: (heightPx: number) => void;
  children: ReactNode;
}> = ({ fillAndScroll = false, collapsed = false, onContentHeightChange, children }) => {
  const { euiTheme } = useEuiTheme();
  const measureRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = measureRef.current;
    if (!node || !onContentHeightChange || fillAndScroll) {
      return undefined;
    }

    const reportHeight = () => {
      const height = measureIntrinsicHeight(node);
      if (height > 0) {
        onContentHeightChange(height);
      }
    };

    reportHeight();
    const observer = new ResizeObserver(reportHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, [fillAndScroll, onContentHeightChange]);

  // Same horizontal padding collapsed/expanded so the header does not shift sideways.
  // Collapsed fills the cell and centers vertically for a tighter look.
  return (
    <div
      css={css`
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 0;
        min-width: 0;
        ${fillAndScroll || collapsed ? 'overflow: hidden;' : ''}
      `}
    >
      <div
        ref={measureRef}
        data-test-subj="aiInsightsShell"
        css={css`
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: ${collapsed ? 'center' : 'flex-start'};
          align-items: stretch;
          gap: ${euiTheme.size.s};
          padding: 0 ${euiTheme.size.s};
          background: ${euiTheme.colors.backgroundBasePlain};
          font-family: ${euiTheme.font.family};
          ${fillAndScroll || collapsed
            ? `
            position: absolute;
            inset: 0;
            height: 100%;
            ${fillAndScroll ? 'overflow-x: hidden; overflow-y: auto;' : ''}
          `
            : `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: auto;
          `}

          > * {
            flex: 0 0 auto;
            margin-block: 0;
          }
        `}
      >
        {children}
      </div>
    </div>
  );
};

/** Content body for empty / loading / insight — no inner border (panel chrome owns the outline). */
const ContentCard: React.FC<{ children: ReactNode; testSubj?: string }> = ({
  children,
  testSubj,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      data-test-subj={testSubj}
      css={css`
        box-sizing: border-box;
        width: 100%;
        height: fit-content;
        flex: 0 0 auto;
        align-self: flex-start;
        border: none;
        background: transparent;
        padding: ${euiTheme.size.xs} 0 0;
      `}
    >
      {children}
    </div>
  );
};

const PanelHeader: React.FC<{
  isExpanded: boolean;
  onToggleExpanded?: () => void;
  trailing?: ReactNode;
}> = ({ isExpanded, onToggleExpanded, trailing }) => {
  const { euiTheme } = useEuiTheme();
  const collapseLabel = isExpanded
    ? i18n.translate('xpack.agentBuilderDashboards.aiInsights.collapsePanel', {
        defaultMessage: 'Collapse AI Insights',
      })
    : i18n.translate('xpack.agentBuilderDashboards.aiInsights.expandPanel', {
        defaultMessage: 'Expand AI Insights',
      });

  const title = i18n.translate('xpack.agentBuilderDashboards.aiInsights.heading', {
    defaultMessage: 'AI Insights',
  });

  const headerItemCss = css`
    display: flex;
    align-items: center;
  `;

  // Match dashboard embPanel title: body font size + medium weight.
  const titleStyles = css`
    display: block;
    margin: 0;
    padding: 0;
    border: none;
    background: none;
    font-size: inherit;
    font-family: inherit;
    line-height: ${euiTheme.size.xl};
    font-weight: ${euiTheme.font.weight.medium};
    color: ${euiTheme.colors.textParagraph};
    cursor: ${onToggleExpanded ? 'pointer' : 'default'};
  `;

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      css={css`
        margin: 0;
        min-height: ${euiTheme.size.xl};
        width: 100%;
      `}
    >
      {onToggleExpanded ? (
        <EuiFlexItem
          grow={false}
          css={css`
            ${headerItemCss};
            width: ${euiTheme.size.l};
            justify-content: center;
          `}
        >
          <EuiButtonIcon
            size="xs"
            iconType={isExpanded ? 'chevronSingleDown' : 'chevronSingleRight'}
            aria-label={collapseLabel}
            aria-expanded={isExpanded}
            onClick={onToggleExpanded}
            data-test-subj="aiInsightsCollapseButton"
          />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false} css={headerItemCss}>
        {onToggleExpanded ? (
          <button
            type="button"
            onClick={onToggleExpanded}
            aria-expanded={isExpanded}
            aria-label={collapseLabel}
            data-test-subj="aiInsightsTitleToggle"
            css={titleStyles}
          >
            {title}
          </button>
        ) : (
          <h2 css={titleStyles}>{title}</h2>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={headerItemCss}>
        <AiIcon iconType="sparkles" size="s" aria-hidden={true} />
      </EuiFlexItem>
      {trailing ? (
        <EuiFlexItem grow={false} css={headerItemCss}>
          {trailing}
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

const StaleInlineNotice: React.FC<{ onUpdate: () => void }> = ({ onUpdate }) => (
  <EuiFlexGroup
    gutterSize="s"
    alignItems="center"
    responsive={false}
    wrap
    data-test-subj="aiInsightsStaleCallout"
  >
    <EuiFlexItem grow={false}>
      <EuiIcon type="warning" color="warning" aria-hidden={true} />
    </EuiFlexItem>
    <EuiFlexItem grow={true}>
      <EuiText size="s" color="subdued">
        <span>
          {i18n.translate('xpack.agentBuilderDashboards.aiInsights.stale.body', {
            defaultMessage:
              'These insights no longer match the current time range or filters.',
          })}{' '}
          <EuiLink onClick={onUpdate} data-test-subj="aiInsightsUpdateButton">
            {i18n.translate('xpack.agentBuilderDashboards.aiInsights.stale.update', {
              defaultMessage: 'Update panel',
            })}
          </EuiLink>
        </span>
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

/** Renders insight copy with inline-code chips for backtick-wrapped names/metrics. */
const InsightMarkdown: React.FC<{ children: string }> = ({ children }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiMarkdownFormat
      textSize="s"
      color="default"
      css={css`
        /* Kill trailing markdown margins that leave a tall empty band in the card. */
        > *:last-child {
          margin-bottom: 0 !important;
        }
        p {
          margin-block: 0 ${euiTheme.size.xs};
        }
        p:last-child {
          margin-bottom: 0;
        }
        ul {
          margin-block: 0;
          padding-inline-start: ${euiTheme.size.base};
        }
        li {
          margin-block: 0;
        }
      `}
    >
      {children}
    </EuiMarkdownFormat>
  );
};

const stripLeadingListMarker = (text: string): string =>
  text.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '');

const SummarySection: React.FC<{
  summary: string;
  attentionPoints: string[];
}> = ({ summary, attentionPoints }) => {
  const { euiTheme } = useEuiTheme();
  // Plain paragraphs — keep bullets only for recommended actions.
  const attentionMarkdown =
    attentionPoints.length > 0
      ? attentionPoints.map(stripLeadingListMarker).join('\n\n')
      : undefined;

  return (
    <div data-test-subj="aiInsightsStatus">
      <InsightMarkdown>{summary}</InsightMarkdown>
      {attentionMarkdown ? (
        <div
          css={css`
            margin-top: ${euiTheme.size.s};
          `}
        >
          <InsightMarkdown>{attentionMarkdown}</InsightMarkdown>
        </div>
      ) : null}
    </div>
  );
};

const RecommendedActionsSection: React.FC<{ actions: string[] }> = ({ actions }) => {
  const { euiTheme } = useEuiTheme();

  if (actions.length === 0) {
    return null;
  }

  return (
    <div data-test-subj="aiInsightsDetails">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="documentation" size="s" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <h3
              css={css`
                margin: 0;
                font-size: inherit;
                font-weight: ${euiTheme.font.weight.medium};
                color: ${euiTheme.colors.textParagraph};
                line-height: 1.3;
              `}
            >
              {i18n.translate('xpack.agentBuilderDashboards.aiInsights.recommendedActions', {
                defaultMessage: 'Recommended actions',
              })}
            </h3>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div
        css={css`
          margin-top: ${euiTheme.size.xs};
        `}
      >
        <InsightMarkdown>
          {actions.map((action) => `- ${action}`).join('\n')}
        </InsightMarkdown>
      </div>
    </div>
  );
};

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Formats an ISO timestamp like Entity summary: "Oct 08, 2026 at 09:43". */
function formatGeneratedAt(iso: string): string | undefined {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${MONTHS[date.getMonth()]} ${pad(date.getDate())}, ${date.getFullYear()} at ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

const InsightFooter: React.FC<{
  generatedBy?: string;
  generatedAt?: string;
  onUpdate: () => void;
  onCopy: () => void;
}> = ({ generatedBy, generatedAt, onUpdate, onCopy }) => {
  const { euiTheme } = useEuiTheme();
  const formattedAt = generatedAt ? formatGeneratedAt(generatedAt) : undefined;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={true}>
        <EuiText size="xs" color="subdued" data-test-subj="aiInsightsGeneratedBy">
          {formattedAt && generatedBy ? (
            <span>
              {i18n.translate('xpack.agentBuilderDashboards.aiInsights.generatedByUserPrefix', {
                defaultMessage: 'Generated by',
              })}{' '}
              <strong>{generatedBy}</strong>{' '}
              {i18n.translate('xpack.agentBuilderDashboards.aiInsights.generatedByUserSuffix', {
                defaultMessage: 'on {timestamp}',
                values: { timestamp: formattedAt },
              })}
            </span>
          ) : formattedAt ? (
            <span>
              {i18n.translate('xpack.agentBuilderDashboards.aiInsights.generatedTimestamp', {
                defaultMessage: 'Generated by AI on {timestamp}',
                values: { timestamp: formattedAt },
              })}
            </span>
          ) : (
            i18n.translate('xpack.agentBuilderDashboards.aiInsights.generatedForDashboard', {
              defaultMessage: 'Generated for this dashboard',
            })
          )}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          size="xs"
          iconType="refresh"
          color="primary"
          aria-label={i18n.translate('xpack.agentBuilderDashboards.aiInsights.regenerate', {
            defaultMessage: 'Regenerate insights',
          })}
          onClick={onUpdate}
          data-test-subj="aiInsightsRegenerateButton"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          size="xs"
          iconType="copy"
          color="primary"
          aria-label={i18n.translate('xpack.agentBuilderDashboards.aiInsights.copy', {
            defaultMessage: 'Copy insights',
          })}
          onClick={onCopy}
          data-test-subj="aiInsightsCopyButton"
          css={css`
            margin-inline-end: -${euiTheme.size.xs};
          `}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const LoadingCard: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <ContentCard testSubj="aiInsightsLoadingSkeleton">
      <EuiText size="s" color="subdued">
        <p
          css={css`
            margin: 0 0 ${euiTheme.size.m} 0;
            line-height: 1.4;
          `}
          data-test-subj="aiInsightsGeneratingBadge"
        >
          {i18n.translate('xpack.agentBuilderDashboards.aiInsights.loadingCard', {
            defaultMessage: 'Generating AI insights and recommended actions…',
          })}
        </p>
      </EuiText>
      <EuiSkeletonText lines={2} />
    </ContentCard>
  );
};

const EmptyCard: React.FC<{
  message: string;
  action: ReactNode;
}> = ({ message, action }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <ContentCard>
      <EuiFlexGroup
        gutterSize="m"
        alignItems="center"
        responsive={false}
        wrap={false}
        justifyContent="spaceBetween"
        css={css`
          min-height: ${euiTheme.size.xl};
        `}
      >
        <EuiFlexItem grow={true}>
          <EuiText size="s" color="subdued">
            <p
              css={css`
                margin: 0;
                line-height: 1.5;
                color: ${euiTheme.colors.textSubdued};
                overflow: visible;
              `}
            >
              {message}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{action}</EuiFlexItem>
      </EuiFlexGroup>
    </ContentCard>
  );
};

const LoadingContent: React.FC<{
  fillAndScroll?: boolean;
  onContentHeightChange?: (heightPx: number) => void;
}> = ({ fillAndScroll, onContentHeightChange }) => (
  <AiInsightsShell fillAndScroll={fillAndScroll} onContentHeightChange={onContentHeightChange}>
    {/* Collapse is disabled while generating — always show the loading card. */}
    <PanelHeader isExpanded={true} />
    <LoadingCard />
  </AiInsightsShell>
);

const EmptyContent: React.FC<{
  message: string;
  action: ReactNode;
  onContentHeightChange?: (heightPx: number) => void;
}> = ({ message, action, onContentHeightChange }) => (
  <AiInsightsShell onContentHeightChange={onContentHeightChange}>
    <PanelHeader isExpanded={true} />
    <EmptyCard message={message} action={action} />
  </AiInsightsShell>
);

function buildCopyText(insight: AiInsightsResult): string {
  const status = insight.status ?? AI_INSIGHTS_STATUS.yellow;
  const lines = [
    AI_INSIGHTS_STATUS_HEADLINE[status],
    insight.summary,
    '',
    ...(insight.attention_points.length > 0
      ? [
          i18n.translate('xpack.agentBuilderDashboards.aiInsights.copy.attention', {
            defaultMessage: 'Attention points',
          }),
          ...insight.attention_points.map((point) => `• ${point}`),
          '',
        ]
      : []),
    ...(insight.suggested_actions.length > 0
      ? [
          i18n.translate('xpack.agentBuilderDashboards.aiInsights.copy.actions', {
            defaultMessage: 'Recommended actions',
          }),
          ...insight.suggested_actions.map((action) => `• ${action}`),
        ]
      : []),
  ];
  return lines.join('\n');
}

export const AiInsightsPanel: React.FC<AiInsightsPanelProps> = ({
  insight,
  isLoading,
  hasConnectors,
  hasSelectedConnector,
  isConnectorsLoading,
  generationMode,
  heightMode = AI_INSIGHTS_HEIGHT_MODE.auto,
  isStale,
  isExpanded = true,
  onToggleExpanded,
  onContentHeightChange,
  onSetupConnector,
  onOpenSettings,
  onGenerate,
  onUpdate,
}) => {
  const fillAndScroll = heightMode === AI_INSIGHTS_HEIGHT_MODE.fixed && isExpanded;

  if (isConnectorsLoading) {
    return (
      <LoadingContent
        fillAndScroll={heightMode === AI_INSIGHTS_HEIGHT_MODE.fixed}
        onContentHeightChange={onContentHeightChange}
      />
    );
  }

  if (!hasConnectors) {
    return (
      <EmptyContent
        onContentHeightChange={onContentHeightChange}
        message={i18n.translate('xpack.agentBuilderDashboards.aiInsights.empty.cardMessage', {
          defaultMessage: 'No model selected. Pick a model to generate AI Insights for this dashboard.',
        })}
        action={
          <AiButton variant="base" size="s" onClick={onSetupConnector}>
            {i18n.translate('xpack.agentBuilderDashboards.aiInsights.empty.cta', {
              defaultMessage: 'Pick model',
            })}
          </AiButton>
        }
      />
    );
  }

  if (!hasSelectedConnector) {
    return (
      <EmptyContent
        onContentHeightChange={onContentHeightChange}
        message={i18n.translate('xpack.agentBuilderDashboards.aiInsights.noInsight.cardMessage', {
          defaultMessage: 'No model selected. Pick a model to generate AI Insights for this dashboard.',
        })}
        action={
          <AiButton variant="base" size="s" onClick={onOpenSettings}>
            {i18n.translate('xpack.agentBuilderDashboards.aiInsights.noInsight.cta', {
              defaultMessage: 'Pick model',
            })}
          </AiButton>
        }
      />
    );
  }

  if (isLoading) {
    return (
      <LoadingContent
        fillAndScroll={heightMode === AI_INSIGHTS_HEIGHT_MODE.fixed}
        onContentHeightChange={onContentHeightChange}
      />
    );
  }

  if (!insight) {
    if (generationMode === AI_INSIGHTS_GENERATION_MODE.on_demand) {
      return (
        <EmptyContent
          onContentHeightChange={onContentHeightChange}
          message={i18n.translate(
            'xpack.agentBuilderDashboards.aiInsights.onDemand.cardMessage',
            {
              defaultMessage:
                'Generate AI Insights for this dashboard to understand what’s going on and see recommended actions.',
            }
          )}
          action={
            <AiButton
              variant="base"
              size="s"
              iconType="sparkles"
              onClick={onGenerate}
              data-test-subj="aiInsightsGenerateButton"
            >
              {i18n.translate('xpack.agentBuilderDashboards.aiInsights.onDemand.cta', {
                defaultMessage: 'Generate',
              })}
            </AiButton>
          }
        />
      );
    }

    return (
      <LoadingContent
        fillAndScroll={heightMode === AI_INSIGHTS_HEIGHT_MODE.fixed}
        onContentHeightChange={onContentHeightChange}
      />
    );
  }

  return (
    <InsightContent
      insight={insight}
      isStale={isStale}
      isExpanded={isExpanded}
      fillAndScroll={fillAndScroll}
      onToggleExpanded={onToggleExpanded}
      onContentHeightChange={onContentHeightChange}
      onUpdate={onUpdate}
    />
  );
};

const InsightContent: React.FC<{
  insight: AiInsightsResult;
  isStale: boolean;
  isExpanded: boolean;
  fillAndScroll?: boolean;
  onToggleExpanded?: () => void;
  onContentHeightChange?: (heightPx: number) => void;
  onUpdate: () => void;
}> = ({
  insight,
  isStale,
  isExpanded,
  fillAndScroll,
  onToggleExpanded,
  onContentHeightChange,
  onUpdate,
}) => {
  const { euiTheme } = useEuiTheme();
  const status = insight.status ?? AI_INSIGHTS_STATUS.yellow;

  const onCopy = () => {
    void navigator.clipboard?.writeText(buildCopyText(insight));
  };

  const header = (
    <PanelHeader
      isExpanded={isExpanded}
      onToggleExpanded={onToggleExpanded}
      trailing={<StatusBadge status={status} onClick={onToggleExpanded} />}
    />
  );

  return (
    <AiInsightsShell
      fillAndScroll={fillAndScroll}
      collapsed={!isExpanded && !fillAndScroll}
      onContentHeightChange={onContentHeightChange}
    >
      {header}
      {isStale ? <StaleInlineNotice onUpdate={onUpdate} /> : null}
      {isExpanded ? (
        <ContentCard>
          <SummarySection
            summary={insight.summary}
            attentionPoints={insight.attention_points}
          />
          {insight.suggested_actions.length > 0 ? (
            <>
              <EuiHorizontalRule
                margin="none"
                css={css`
                  margin-block: ${euiTheme.size.m};
                `}
              />
              <RecommendedActionsSection actions={insight.suggested_actions} />
            </>
          ) : null}
          <EuiHorizontalRule
            margin="none"
            css={css`
              margin-block: ${euiTheme.size.s};
            `}
          />
          <InsightFooter
            generatedBy={insight.generated_by}
            generatedAt={insight.generated_at}
            onUpdate={onUpdate}
            onCopy={onCopy}
          />
        </ContentCard>
      ) : null}
    </AiInsightsShell>
  );
};
