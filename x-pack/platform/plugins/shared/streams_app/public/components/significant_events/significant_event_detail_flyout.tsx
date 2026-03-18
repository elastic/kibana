/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InlineSegment {
  text: string;
  badge?: boolean;
}

export interface SignificantEvent {
  id: string;
  title: string;
  severity: 'critical' | 'medium' | 'low';
  condition: InlineSegment[];
  status: string;
  timestamp: string;
}

interface Recommendation {
  id: string;
  severity: 'critical' | 'medium' | 'low';
  title: string;
  stepCount: number;
  description: InlineSegment[];
  codeBlocks: string[];
}

// ─── Mock detail data per event ───────────────────────────────────────────────

const MOCK_DETAILS: Record<
  string,
  {
    subtitle: string;
    relevance: string;
    type: string;
    statusDetail: string;
    description: string;
    topEvent: { percentage: number; condition: string };
    recommendations: Recommendation[];
  }
> = {
  '1': {
    subtitle: 'ArgoCd Cluster Connectivity I/O Timeout Alert',
    relevance: '75',
    type: 'Incident',
    statusDetail: '←1 logs.space',
    description:
      "The CBS (Component-Based Servicing) service on Windows is experiencing frequent warnings and errors related to unrecognized package attributes and invalid manifest items. These issues suggest potential misconfigurations or compatibility problems with recent updates or changes. The unrecognized package warnings could be related to the manifest errors, indicating a systemic issue with the CBS service's handling of updates or configurations. If not addressed, these could lead to service degradation or instability across multiple hosts.",
    topEvent: { percentage: 83, condition: 'message:"authentication failure"' },
    recommendations: [
      {
        id: 'r1',
        severity: 'critical',
        title: 'Immediately Restart Cart Service Pod',
        stepCount: 4,
        description: [
          { text: 'The cart service pod ' },
          { text: 'cart-69f76815-phtlé', badge: true },
          {
            text: ' shut down at 10:04 UTC and has not recovered. Kubernetes should have restarted it automatically - check if the pod is in ',
          },
          { text: 'CrashLoopBackOff', badge: true },
          { text: ' or Pending state.' },
        ],
        codeBlocks: [
          'kubectl get pods -n ntel-demo | grep cart',
          'kubectl describe pod cart-69f76815-phtlé -n ntel-demo',
          'kubectl logs -n ntel-demo -l app=cart --previous\n# check crash reason',
          'kubectl rollout restart deployment/cart -n ntel-demo\n# if stuck',
        ],
      },
      {
        id: 'r2',
        severity: 'critical',
        title: 'Investigate Product Catalog Service Outage',
        stepCount: 4,
        description: [
          { text: 'The ' },
          { text: 'frontend', badge: true },
          { text: ' is also failed to connect to ' },
          { text: 'api.124.176.999 (getProduct, calls)', badge: true },
          { text: '. Identify which service owns this endpoint and restore it.' },
        ],
        codeBlocks: [
          'kubectl get svc -n ntel-demo | grep 9999',
          'kubectl describe pod -n ntel-demo -l app=product-catalog-pod',
          'kubectl describe pod -n ntel-demo -l app=product-catalog-pod-',
          'Check for recent deployments or config changes affecting the product catalog',
        ],
      },
      {
        id: 'r3',
        severity: 'low',
        title: 'Verify Kubernetes Deployment Health for All Services',
        stepCount: 3,
        description: [
          {
            text: 'The simultaneous shutdown of cart and product catalog suggests a possible node-level-event, resource pressure, or a rolling restart gone wrong.',
          },
        ],
        codeBlocks: [
          'kubectl top nodes pod cart-69f76815-phtlé -n ntel-demo',
          'kubectl get events -n ntel-demo | app=cart --previous\n# check crash reason',
        ],
      },
    ],
  },
  default: {
    subtitle: 'Service Health Alert',
    relevance: '62',
    type: 'Incident',
    statusDetail: '←1 logs.space',
    description:
      'An anomalous pattern has been detected across multiple service endpoints. The system is showing signs of degraded performance that may impact end-user experience. Immediate investigation is recommended to prevent further escalation.',
    topEvent: { percentage: 67, condition: 'status:"service_unavailable"' },
    recommendations: [
      {
        id: 'r1',
        severity: 'critical',
        title: 'Investigate Service Health',
        stepCount: 3,
        description: [
          { text: 'The affected ' },
          { text: 'service', badge: true },
          { text: ' is showing elevated error rates. Check pod status and logs.' },
        ],
        codeBlocks: [
          'kubectl get pods -n ntel-demo | grep service',
          'kubectl describe pod -n ntel-demo',
          'kubectl logs -n ntel-demo --previous',
        ],
      },
      {
        id: 'r2',
        severity: 'medium',
        title: 'Review Recent Deployments',
        stepCount: 2,
        description: [
          { text: 'Check if a recent deployment to ' },
          { text: 'production', badge: true },
          { text: ' may have introduced this issue.' },
        ],
        codeBlocks: [
          'kubectl rollout history deployment -n ntel-demo',
          'kubectl rollout undo deployment -n ntel-demo\n# if needed',
        ],
      },
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_BADGE_COLOR: Record<SignificantEvent['severity'], string> = {
  critical: 'accent',
  medium: 'warning',
  low: 'success',
};

const SEVERITY_LABEL: Record<SignificantEvent['severity'], string> = {
  critical: 'Critical',
  medium: 'Medium',
  low: 'Low',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Horizontal rule between flyout sections */
function SectionGap() {
  return (
    <div
      css={css`
        height: 16px;
      `}
    />
  );
}

/** Consistent bordered panel wrapper used for each flyout section */
function SectionPanel({ children }: { children: React.ReactNode }) {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        border: 1px solid ${euiTheme.colors.borderBaseSubdued};
        border-radius: 6px;
        overflow: hidden;
      `}
    >
      {children}
    </div>
  );
}

/** Section header row: title on left, optional actions on right */
function SectionHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
      `}
    >
      <span
        css={css`
          font-family: ${euiTheme.font.family};
          font-size: 14px;
          font-weight: ${euiTheme.font.weight.semiBold};
          line-height: 20px;
          color: ${euiTheme.colors.textHeading};
        `}
      >
        {title}
      </span>
      {actions && <div>{actions}</div>}
    </div>
  );
}

/** A single key/value row in the attribute list — matches Figma 172px key column */
function AttributeRow({ label, value }: { label: string; value: React.ReactNode }) {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        min-height: 32px;
        padding: 8px 0;
        border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};

        &:last-child {
          border-bottom: none;
        }
      `}
    >
      <span
        css={css`
          width: 172px;
          flex-shrink: 0;
          font-family: ${euiTheme.font.family};
          font-size: 14px;
          font-weight: ${euiTheme.font.weight.semiBold};
          line-height: 16px;
          color: ${euiTheme.colors.textSubdued};
        `}
      >
        {label}
      </span>
      <div
        css={css`
          flex: 1;
          min-width: 0;
          font-family: ${euiTheme.font.family};
          font-size: 14px;
          line-height: 20px;
          color: ${euiTheme.colors.textParagraph};
        `}
      >
        {value}
      </div>
    </div>
  );
}

/** Inline condition text with interleaved hollow badges */
function ConditionText({ segments }: { segments: InlineSegment[] }) {
  const { euiTheme } = useEuiTheme();
  return (
    <span
      css={css`
        display: inline-flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px;
        font-family: ${euiTheme.font.family};
        font-size: 14px;
        line-height: 20px;
        color: ${euiTheme.colors.textParagraph};
      `}
    >
      {segments.map((seg, i) =>
        seg.badge ? (
          <EuiBadge key={i} color="hollow">
            {seg.text}
          </EuiBadge>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </span>
  );
}

/** One expandable recommendation card */
function RecommendationItem({ rec }: { rec: Recommendation }) {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      css={css`
        border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};

        &:last-child {
          border-bottom: none;
        }
      `}
    >
      {/* Accordion trigger row */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        css={css`
          display: flex;
          align-items: center;
          width: 100%;
          padding: 12px 16px;
          gap: 8px;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
        `}
      >
        <EuiBadge
          color={SEVERITY_BADGE_COLOR[rec.severity]}
          css={css`
            flex-shrink: 0;
          `}
        >
          {SEVERITY_LABEL[rec.severity]}
        </EuiBadge>
        <span
          css={css`
            flex: 1;
            font-family: ${euiTheme.font.family};
            font-size: 14px;
            font-weight: ${euiTheme.font.weight.medium};
            line-height: 20px;
            color: ${euiTheme.colors.textHeading};
          `}
        >
          {rec.title}
        </span>
        <span
          css={css`
            font-family: ${euiTheme.font.family};
            font-size: 12px;
            color: ${euiTheme.colors.textSubdued};
            white-space: nowrap;
            flex-shrink: 0;
          `}
        >
          {i18n.translate('xpack.streams.significantEvents.flyout.steps', {
            defaultMessage: '{count} steps',
            values: { count: rec.stepCount },
          })}
        </span>
        <EuiIcon
          type={isOpen ? 'arrowUp' : 'arrowDown'}
          size="s"
          color="subdued"
          aria-hidden
          css={css`
            flex-shrink: 0;
          `}
        />
      </button>

      {/* Expanded body */}
      {isOpen && (
        <div
          css={css`
            padding: 0 16px 16px 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          `}
        >
          {/* Description with inline badges */}
          <div
            css={css`
              padding: 8px 16px;
              background: ${euiTheme.colors.backgroundBaseSubdued};
              border-radius: 4px;
            `}
          >
            <ConditionText segments={rec.description} />
          </div>

          {/* Code blocks */}
          {rec.codeBlocks.map((block, i) => (
            <EuiCodeBlock key={i} language="bash" paddingSize="s" isCopyable fontSize="s">
              {block}
            </EuiCodeBlock>
          ))}
        </div>
      )}
    </div>
  );
}

/** Simplified event timeline — 3 rows of dots on a horizontal track */
function EventsTimeline() {
  const { euiTheme } = useEuiTheme();
  const rows = ['logs.ecs', 'logs.ecs', 'logs.ecs'];
  const dotPositions = [
    [15, 22, 38, 42, 55, 67, 73],
    [12, 28, 44, 56, 68, 75, 82],
    [8, 19, 31, 48, 59, 71, 88],
  ];

  return (
    <div
      css={css`
        padding: 12px 20px 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      `}
    >
      {/* Time axis */}
      <div
        css={css`
          display: flex;
          justify-content: space-between;
          padding-left: 96px;
        `}
      >
        {['11:45:00', '11:45:15', '11:45:30', '11:45:45', '11:46:00'].map((t) => (
          <span
            key={t}
            css={css`
              font-family: ${euiTheme.font.family};
              font-size: 10px;
              color: ${euiTheme.colors.textSubdued};
            `}
          >
            {t}
          </span>
        ))}
      </div>

      {/* Timeline rows */}
      {rows.map((label, rowIdx) => (
        <div
          key={rowIdx}
          css={css`
            display: flex;
            align-items: center;
            gap: 8px;
          `}
        >
          <span
            css={css`
              width: 80px;
              flex-shrink: 0;
              font-family: ${euiTheme.font.family};
              font-size: 12px;
              color: ${euiTheme.colors.textSubdued};
              text-align: right;
            `}
          >
            {label}
          </span>
          <div
            css={css`
              flex: 1;
              position: relative;
              height: 24px;
              display: flex;
              align-items: center;
            `}
          >
            {/* Track line */}
            <div
              css={css`
                position: absolute;
                left: 0;
                right: 0;
                height: 1px;
                background: ${euiTheme.colors.borderBaseSubdued};
              `}
            />
            {/* Event dots */}
            {dotPositions[rowIdx].map((pct, i) => (
              <div
                key={i}
                css={css`
                  position: absolute;
                  left: ${pct}%;
                  width: 8px;
                  height: 8px;
                  border-radius: 50%;
                  background: ${euiTheme.colors.vis.euiColorVisDanger0};
                  transform: translateX(-50%);
                  z-index: 1;
                `}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main flyout component ────────────────────────────────────────────────────

interface SignificantEventDetailFlyoutProps {
  event: SignificantEvent;
  onClose: () => void;
}

export function SignificantEventDetailFlyout({
  event,
  onClose,
}: SignificantEventDetailFlyoutProps) {
  const { euiTheme } = useEuiTheme();
  const details = MOCK_DETAILS[event.id] ?? MOCK_DETAILS.default;
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);

  return (
    <EuiFlyout
      type="push"
      size="m"
      onClose={onClose}
      aria-labelledby="sigEventDetailFlyoutTitle"
      paddingSize="none"
      pushMinBreakpoint="xs"
    >
      {/* ── Header ── */}
      <EuiFlyoutHeader hasBorder>
        <div
          css={css`
            padding: 12px 16px;
          `}
        >
          {/* Top row: badge + timestamp + close */}
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={SEVERITY_BADGE_COLOR[event.severity]}>
                    {i18n.translate('xpack.streams.significantEvents.flyout.incidentBadge', {
                      defaultMessage: 'Incident',
                    })}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <span>
                      {i18n.translate('xpack.streams.significantEvents.flyout.generatedAt', {
                        defaultMessage: 'Generated today at 11:22 AM',
                      })}
                    </span>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="iInCircle" size="s" color="subdued" aria-hidden />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>            
          </EuiFlexGroup>

          {/* Title */}
          <EuiTitle size="m">
            <h2 id="sigEventDetailFlyoutTitle">{event.title}</h2>
          </EuiTitle>
        </div>
      </EuiFlyoutHeader>

      {/* ── Body ── */}
      <EuiFlyoutBody>
        <div
          css={css`
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding: 24px;
          `}
        >
          {/* ── General information ── */}
          <SectionPanel>
            <SectionHeader
              title={i18n.translate('xpack.streams.significantEvents.flyout.generalInfo', {
                defaultMessage: 'General information',
              })}
              actions={
                <EuiButtonIcon
                  iconType="pencil"
                  size="xs"
                  color="text"
                  aria-label={i18n.translate(
                    'xpack.streams.significantEvents.flyout.editGeneralInfo',
                    { defaultMessage: 'Edit general information' }
                  )}
                />
              }
            />
            <div
              css={css`
                padding: 0 20px;
              `}
            >
              <AttributeRow
                label={i18n.translate('xpack.streams.significantEvents.flyout.titleLabel', {
                  defaultMessage: 'Title',
                })}
                value={details.subtitle}
              />
              <AttributeRow
                label={i18n.translate('xpack.streams.significantEvents.flyout.severityLabel', {
                  defaultMessage: 'Severity',
                })}
                value={
                  <EuiBadge color={SEVERITY_BADGE_COLOR[event.severity]}>
                    {SEVERITY_LABEL[event.severity]}
                  </EuiBadge>
                }
              />
              <AttributeRow
                label={i18n.translate('xpack.streams.significantEvents.flyout.relevanceLabel', {
                  defaultMessage: 'Relevance',
                })}
                value={<EuiBadge color="hollow">{details.relevance}</EuiBadge>}
              />
              <AttributeRow
                label={i18n.translate('xpack.streams.significantEvents.flyout.typeLabel', {
                  defaultMessage: 'Type',
                })}
                value={details.type}
              />
              <AttributeRow
                label={i18n.translate('xpack.streams.significantEvents.flyout.statusLabel', {
                  defaultMessage: 'Status',
                })}
                value={
                  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="arrowLeft" size="s" color="subdued" aria-hidden />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">
                        <span>{details.statusDetail}</span>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
              />
            </div>
          </SectionPanel>

          {/* ── Description ── */}
          <SectionPanel>
            <SectionHeader
              title={i18n.translate('xpack.streams.significantEvents.flyout.description', {
                defaultMessage: 'Description',
              })}
              actions={
                <EuiButtonIcon
                  iconType="pencil"
                  size="xs"
                  color="text"
                  aria-label={i18n.translate(
                    'xpack.streams.significantEvents.flyout.editDescription',
                    { defaultMessage: 'Edit description' }
                  )}
                />
              }
            />
            <div
              css={css`
                padding: 16px 20px;
              `}
            >
              <EuiText size="s">
                <p>{details.description}</p>
              </EuiText>
            </div>
          </SectionPanel>

          {/* ── Top 5 events ── */}
          <SectionPanel>
            <div
              css={css`
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 20px;
                border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
              `}
            >
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <span
                    css={css`
                      font-family: ${euiTheme.font.family};
                      font-size: 14px;
                      font-weight: ${euiTheme.font.weight.semiBold};
                      line-height: 20px;
                      color: ${euiTheme.colors.textHeading};
                    `}
                  >
                    {i18n.translate('xpack.streams.significantEvents.flyout.top5Events', {
                      defaultMessage: 'Top 5 events',
                    })}
                  </span>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="iInCircle" size="s" color="subdued" aria-hidden />
                </EuiFlexItem>
              </EuiFlexGroup>
              {/* Pagination arrows */}
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="arrowLeft"
                    size="xs"
                    color="text"
                    aria-label={i18n.translate('xpack.streams.significantEvents.flyout.prevEvent', {
                      defaultMessage: 'Previous event',
                    })}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <span>1</span>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="arrowRight"
                    size="xs"
                    color="text"
                    aria-label={i18n.translate('xpack.streams.significantEvents.flyout.nextEvent', {
                      defaultMessage: 'Next event',
                    })}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
            <div
              css={css`
                padding: 16px 20px;
              `}
            >
              {/* Top event row */}
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <span>
                      {i18n.translate('xpack.streams.significantEvents.flyout.topEventLabel', {
                        defaultMessage: 'Top event contributing to this significant event',
                      })}
                    </span>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {i18n.translate('xpack.streams.significantEvents.flyout.of5', {
                      defaultMessage: 'of 5',
                    })}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>

              {/* Bar + condition */}
              <div
                css={css`
                  margin-top: 8px;
                  display: flex;
                  gap: 12px;
                  align-items: flex-start;
                  padding: 0 0 0 12px;
                  border-left: 4px solid ${euiTheme.colors.vis.euiColorVisDanger0};
                `}
              >
                <div
                  css={css`
                    flex: 1;
                    min-width: 0;
                  `}
                >
                  {/* Percentage + bar */}
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <span
                        css={css`
                          font-family: ${euiTheme.font.family};
                          font-size: 14px;
                          font-weight: ${euiTheme.font.weight.semiBold};
                          color: ${euiTheme.colors.textHeading};
                          min-width: 28px;
                        `}
                      >
                        {details.topEvent.percentage}
                      </span>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <div
                        css={css`
                          height: 8px;
                          background: ${euiTheme.colors.backgroundBaseSubdued};
                          border-radius: 4px;
                          overflow: hidden;
                        `}
                      >
                        <div
                          css={css`
                            width: ${details.topEvent.percentage}%;
                            height: 100%;
                            background: ${euiTheme.colors.vis.euiColorVisDanger0};
                            border-radius: 4px;
                          `}
                        />
                      </div>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  {/* Condition */}
                  <EuiText
                    size="xs"
                    css={css`
                      margin-top: 6px;
                      font-family: 'Courier New', monospace;
                      color: ${euiTheme.colors.textSubdued};
                    `}
                  >
                    <span>{details.topEvent.condition}</span>
                  </EuiText>
                </div>
              </div>
            </div>
          </SectionPanel>

          {/* ── Recommendations ── */}
          <SectionPanel>
            {/* Header row with badge + buttons */}
            <div
              css={css`
                display: flex;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
                gap: 8px;
              `}
            >
              <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
                <EuiFlexItem grow={false}>
                  <span
                    css={css`
                      font-family: ${euiTheme.font.family};
                      font-size: 14px;
                      font-weight: ${euiTheme.font.weight.semiBold};
                      line-height: 20px;
                      color: ${euiTheme.colors.textHeading};
                    `}
                  >
                    {i18n.translate('xpack.streams.significantEvents.flyout.recommendations', {
                      defaultMessage: 'Recommendations',
                    })}
                  </span>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{details.recommendations.length}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFlexGroup
                alignItems="center"
                responsive={false}
                gutterSize="xs"
                justifyContent="flexEnd"
              >
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="pencil"
                    size="s"
                    color="text"
                    aria-label={i18n.translate(
                      'xpack.streams.significantEvents.flyout.editRecommendations',
                      { defaultMessage: 'Edit recommendations' }
                    )}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    iconType="sparkles"
                    iconSide="left"
                    data-test-subj="streamsSignificantEventsInspectWorkflowButton"
                  >
                    {i18n.translate('xpack.streams.significantEvents.flyout.inspectWorkflow', {
                      defaultMessage: 'Inspect workflow',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>

            {/* Description */}
            <div
              css={css`
                padding: 12px 16px;
                border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
              `}
            >
              <EuiText size="s" color="subdued">
                <p>
                  {i18n.translate('xpack.streams.significantEvents.flyout.recommendationsDesc', {
                    defaultMessage:
                      "This insight has started at 11:45:00, and it's still ongoing. Here are {count} steps to handle that insight.",
                    values: { count: details.recommendations.length },
                  })}
                </p>
              </EuiText>
            </div>

            {/* Recommendation items */}
            {details.recommendations.map((rec) => (
              <RecommendationItem key={rec.id} rec={rec} />
            ))}
          </SectionPanel>

          {/* ── Events timeline ── */}
          <SectionPanel>
            <button
              type="button"
              onClick={() => setIsTimelineExpanded((v) => !v)}
              css={css`
                display: flex;
                align-items: center;
                width: 100%;
                padding: 12px 16px;
                gap: 8px;
                background: none;
                border: none;
                cursor: pointer;
                text-align: left;
                border-bottom: ${isTimelineExpanded
                  ? `1px solid ${euiTheme.colors.borderBaseSubdued}`
                  : 'none'};
              `}
            >
              <EuiIcon
                type={isTimelineExpanded ? 'arrowDown' : 'arrowRight'}
                size="s"
                aria-hidden
              />
              <span
                css={css`
                  font-family: ${euiTheme.font.family};
                  font-size: 14px;
                  font-weight: ${euiTheme.font.weight.semiBold};
                  line-height: 20px;
                  color: ${euiTheme.colors.textHeading};
                `}
              >
                {i18n.translate('xpack.streams.significantEvents.flyout.eventsTimeline', {
                  defaultMessage: 'Events timeline',
                })}
              </span>
            </button>
            {isTimelineExpanded && <EventsTimeline />}
          </SectionPanel>

          <SectionGap />
        </div>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
