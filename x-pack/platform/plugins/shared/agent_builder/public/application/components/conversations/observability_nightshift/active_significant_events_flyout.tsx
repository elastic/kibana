/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiAvatar,
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { i18n } from '@kbn/i18n';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { NightshiftInfoPanel } from './nightshift_info_panel';
import { NightshiftMetadataIconCard } from './nightshift_metadata_icon_row';
import { NightshiftStreamsMetricTiles } from './nightshift_streams_metric_tiles';
import { SignificantEventChildFlyoutBody } from './significant_event_child_flyout_body';

export interface ActiveSignificantEventsFlyoutProps {
  onClose: () => void;
}

interface PrototypeSigEvent {
  id: string;
  label: string;
  subtitle: string;
  severityLabel: string;
  severityColor: React.ComponentProps<typeof EuiBadge>['color'];
}

const mainFlyoutMenuTitle = i18n.translate(
  'xpack.agentBuilder.observabilityNightshift.sigEvents.flyoutSessionTitle',
  {
    defaultMessage: 'Active significant events',
  }
);

/** Prototype list labels: “{area} - {impact}” style, unique per row (24). */
const SIG_EVENT_PROTOTYPE_ROWS = [
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle01',
    titleDefault: 'Fleet Server Dependency Chain - Single Point of Failure',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub01',
    subDefault: 'logs · fleet-coordination',
  },
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle02',
    titleDefault: 'Central Authentication Server - Outage Impact',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub02',
    subDefault: 'metrics · identity',
  },
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle03',
    titleDefault: 'Payment Gateway Integration - Downtime Risk',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub03',
    subDefault: 'logs · checkout',
  },
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle04',
    titleDefault: 'Primary DNS Server - Resolution Timeout Spike',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub04',
    subDefault: 'metrics · edge-dns',
  },
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle05',
    titleDefault: 'API Gateway Throttling - Impact on Microservices',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub05',
    subDefault: 'logs · api-gateway',
  },
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle06',
    titleDefault: 'Database Connection Pooling - Potential Bottleneck',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub06',
    subDefault: 'metrics · orders-db',
  },
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle07',
    titleDefault: 'Load Balancer Configuration - Failover Concerns',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub07',
    subDefault: 'logs · ingress',
  },
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle08',
    titleDefault: 'Message Broker Throughput - Backpressure Effects',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub08',
    subDefault: 'metrics · kafka-main',
  },
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle09',
    titleDefault: 'Observability Ingest Pipeline - Elevated Error Rate',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub09',
    subDefault: 'logs · otel-collector',
  },
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle10',
    titleDefault: 'Kubernetes Control Plane - Elevated API Latency',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub10',
    subDefault: 'metrics · kube-system',
  },
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle11',
    titleDefault: 'Edge CDN Cache Layer - Elevated Origin Load',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub11',
    subDefault: 'logs · cdn-edge',
  },
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle12',
    titleDefault: 'Cross-Region Session Replication - Consistency Lag',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub12',
    subDefault: 'metrics · session-store',
  },
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle13',
    titleDefault: 'Secrets Manager Rotation - Authentication Failures',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub13',
    subDefault: 'logs · security-vault',
  },
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle14',
    titleDefault: 'Elasticsearch Cluster - Shard Relocation Storm',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub14',
    subDefault: 'metrics · search-tier',
  },
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle15',
    titleDefault: 'Service Mesh Sidecar - Connection Exhaustion',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub15',
    subDefault: 'logs · mesh-proxy',
  },
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle16',
    titleDefault: 'Redis Cluster Failover - Brief Write Unavailability',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub16',
    subDefault: 'metrics · cache-hot',
  },
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle17',
    titleDefault: 'Container Registry Pulls - Rate Limit Breach',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub17',
    subDefault: 'logs · registry',
  },
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle18',
    titleDefault: 'Webhook Delivery Worker - Retry Queue Build-up',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub18',
    subDefault: 'metrics · integrations',
  },
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle19',
    titleDefault: 'Metrics Scraping Agent - Missing Samples Window',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub19',
    subDefault: 'logs · prometheus',
  },
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle20',
    titleDefault: 'Background Job Scheduler - Missed Execution Windows',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub20',
    subDefault: 'metrics · job-runner',
  },
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle21',
    titleDefault: 'Object Storage Access Pattern - Unexpected Traffic Spike',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub21',
    subDefault: 'logs · blob-tier',
  },
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle22',
    titleDefault: 'Identity Federation Broker - Token Validation Delays',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub22',
    subDefault: 'metrics · sso-bridge',
  },
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle23',
    titleDefault: 'Feature Flag Service - Inconsistent Evaluation Results',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub23',
    subDefault: 'logs · flags-api',
  },
  {
    titleId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoTitle24',
    titleDefault: 'Search Index Rebuild - Prolonged Query Latency',
    subId: 'xpack.agentBuilder.observabilityNightshift.sigEvents.protoSub24',
    subDefault: 'metrics · search-replica',
  },
] as const;

const SIGNIFICANT_EVENTS_LIST_TOTAL = SIG_EVENT_PROTOTYPE_ROWS.length;

export const ActiveSignificantEventsFlyout: React.FC<ActiveSignificantEventsFlyoutProps> = ({
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();
  const { upsertAttachments } = useConversationContext();
  const headingId = useGeneratedHtmlId({ prefix: 'activeSigEventsFlyout' });
  const childFlyoutHeadingId = useGeneratedHtmlId({ prefix: 'sigEventChildFlyoutHeading' });
  const [selectedEvent, setSelectedEvent] = useState<PrototypeSigEvent | null>(null);

  const description = useMemo(
    () =>
      i18n.translate('xpack.agentBuilder.observabilityNightshift.sigEvents.summaryIntro', {
        defaultMessage:
          'Significant events highlight unusual patterns in your streams—spikes, drops, or rare combinations worth reviewing before they affect dependent services. The summary below reflects the same framing as Significant Events discovery: what changed, on which streams, and how severe the shift is relative to baseline.',
      }),
    []
  );

  const prototypeEvents: PrototypeSigEvent[] = useMemo(() => {
    const criticalLabel = i18n.translate(
      'xpack.agentBuilder.observabilityNightshift.sigEvents.severityCritical',
      {
        defaultMessage: 'Critical',
      }
    );
    const highLabel = i18n.translate(
      'xpack.agentBuilder.observabilityNightshift.sigEvents.severityHigh',
      {
        defaultMessage: 'High',
      }
    );

    return SIG_EVENT_PROTOTYPE_ROWS.map((row, i) => {
      const n = i + 1;
      const isCritical = i % 2 === 0;
      return {
        id: String(n),
        label: i18n.translate(row.titleId, {
          defaultMessage: row.titleDefault,
        }),
        subtitle: i18n.translate(row.subId, {
          defaultMessage: row.subDefault,
        }),
        severityLabel: isCritical ? criticalLabel : highLabel,
        severityColor: isCritical ? 'danger' : 'warning',
      };
    });
  }, []);

  const toggleChildForEvent = useCallback((ev: PrototypeSigEvent) => {
    setSelectedEvent((current) => (current?.id === ev.id ? null : ev));
  }, []);

  const closeChild = useCallback(() => setSelectedEvent(null), []);

  const attachSignificantEventContext = useCallback(
    (ev: PrototypeSigEvent) => {
      upsertAttachments?.([
        {
          id: `nightshift-sig-event-${ev.id}`,
          type: AttachmentType.text,
          data: {
            label: ev.label,
            icon_type: 'indexClose',
            content: i18n.translate(
              'xpack.agentBuilder.observabilityNightshift.attachment.sigEventText',
              {
                defaultMessage:
                  'Nightshift — significant event\nTitle: {title}\nStream: {stream}\nSeverity: {severity}',
                values: {
                  title: ev.label,
                  stream: ev.subtitle,
                  severity: ev.severityLabel,
                },
              }
            ),
          },
        },
      ]);
    },
    [upsertAttachments]
  );

  const ongoingLabel = i18n.translate(
    'xpack.agentBuilder.observabilityNightshift.sigEvents.statusOngoing',
    {
      defaultMessage: 'Ongoing',
    }
  );

  return (
    <EuiFlyout
      type="push"
      side="right"
      size="40%"
      onClose={onClose}
      aria-labelledby={headingId}
      pushMinBreakpoint="xs"
      paddingSize="m"
      session="start"
      flyoutMenuProps={{
        title: mainFlyoutMenuTitle,
      }}
      data-test-subj="agentBuilderActiveSignificantEventsFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h2 id={headingId}>
                {i18n.translate(
                  'xpack.agentBuilder.observabilityNightshift.sigEvents.flyoutTitle',
                  {
                    defaultMessage: 'Active significant events',
                  }
                )}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={true} wrap>
              <EuiFlexItem grow={true}>
                <NightshiftMetadataIconCard
                  title={i18n.translate(
                    'xpack.agentBuilder.observabilityNightshift.sigEvents.metaSeverity',
                    {
                      defaultMessage: 'Healthy entitites',
                    }
                  )}
                  iconType="alert"
                  value="24"
                  color={euiTheme.colors.backgroundLightSuccess}
                  iconColor={euiTheme.colors.severity.success}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                <NightshiftMetadataIconCard
                  title={i18n.translate(
                    'xpack.agentBuilder.observabilityNightshift.sigEvents.metaStream',
                    {
                      defaultMessage: 'Affected systems',
                    }
                  )}
                  iconType="indexOpen"
                  value="20"
                  color={euiTheme.colors.backgroundLightDanger}
                  iconColor={euiTheme.colors.severity.danger}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                <NightshiftMetadataIconCard
                  title={i18n.translate(
                    'xpack.agentBuilder.observabilityNightshift.sigEvents.metaWindow',
                    {
                      defaultMessage: 'At risk',
                    }
                  )}
                  iconType="clock"
                  value="4"
                  color={euiTheme.colors.backgroundLightRisk}
                  iconColor={euiTheme.colors.severity.risk}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <NightshiftInfoPanel
              title={i18n.translate(
                'xpack.agentBuilder.observabilityNightshift.sigEvents.detailsPanelTitle',
                {
                  defaultMessage: 'Summary',
                }
              )}
            >
              <EuiText size="s">
                <p>{description}</p>
              </EuiText>
            </NightshiftInfoPanel>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <NightshiftStreamsMetricTiles />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate(
                  'xpack.agentBuilder.observabilityNightshift.sigEvents.listHeadingWithTotal',
                  {
                    defaultMessage: 'Significant events ({total})',
                    values: { total: SIGNIFICANT_EVENTS_LIST_TOTAL },
                  }
                )}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiPanel hasBorder paddingSize="none" data-test-subj="agentBuilderSigEventsListPanel">
              {prototypeEvents.map((ev, index) => {
                const isChildOpen = selectedEvent?.id === ev.id;
                return (
                  <React.Fragment key={ev.id}>
                    {index > 0 ? <EuiHorizontalRule margin="none" /> : null}
                    <div
                      css={css`
                        padding: ${euiTheme.size.s} ${euiTheme.size.m};
                      `}
                    >
                      <EuiFlexGroup
                        alignItems="center"
                        gutterSize="s"
                        responsive={false}
                        wrap={false}
                      >
                        <EuiFlexItem grow={false}>
                          <EuiButtonIcon
                            iconType={isChildOpen ? 'minimize' : 'maximize'}
                            display="empty"
                            size="xs"
                            color="text"
                            onClick={() => toggleChildForEvent(ev)}
                            aria-label={
                              isChildOpen
                                ? i18n.translate(
                                    'xpack.agentBuilder.observabilityNightshift.sigEvents.collapseDetailsAria',
                                    {
                                      defaultMessage: 'Collapse details for {name}',
                                      values: { name: ev.label },
                                    }
                                  )
                                : i18n.translate(
                                    'xpack.agentBuilder.observabilityNightshift.sigEvents.expandDetailsAria',
                                    {
                                      defaultMessage: 'Open details for {name}',
                                      values: { name: ev.label },
                                    }
                                  )
                            }
                            aria-expanded={isChildOpen}
                            data-test-subj={`agentBuilderSigEventExpand-${ev.id}`}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiAvatar
                            type="space"
                            size="s"
                            name={ongoingLabel}
                            iconType="play"
                            color={euiTheme.colors.backgroundLightAccent}
                            iconColor={euiTheme.colors.accentText}
                            aria-label={ongoingLabel}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={true}>
                          <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
                            <EuiFlexItem grow={false}>
                              <EuiText
                                size="xs"
                                css={css`
                                  font-weight: ${euiTheme.font.weight.medium};
                                `}
                              >
                                {ev.label}
                              </EuiText>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiBadge color={ev.severityColor}>{ev.severityLabel}</EuiBadge>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButtonIcon
                            iconType="paperClip"
                            display="empty"
                            size="xs"
                            color="text"
                            onClick={() => attachSignificantEventContext(ev)}
                            aria-label={i18n.translate(
                              'xpack.agentBuilder.observabilityNightshift.sigEvents.attachAria',
                              {
                                defaultMessage: 'Attach context for {name}',
                                values: { name: ev.label },
                              }
                            )}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButtonIcon
                            iconType="boxesVertical"
                            display="empty"
                            size="xs"
                            color="text"
                            aria-label={i18n.translate(
                              'xpack.agentBuilder.observabilityNightshift.sigEvents.rowMenuAria',
                              {
                                defaultMessage: 'More actions for {name}',
                                values: { name: ev.label },
                              }
                            )}
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </div>
                  </React.Fragment>
                );
              })}
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>

      {selectedEvent ? (
        <EuiFlyout
          type="push"
          side="right"
          size="s"
          onClose={closeChild}
          session="inherit"
          ownFocus={false}
          pushMinBreakpoint="xs"
          paddingSize="m"
          flyoutMenuProps={{
            title: selectedEvent.label,
            iconType: selectedEvent.severityColor === 'danger' ? 'errorFilled' : 'warning',
          }}
          aria-labelledby={childFlyoutHeadingId}
          data-test-subj="agentBuilderSignificantEventChildFlyout"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="xs">
              <h2 id={childFlyoutHeadingId}>{selectedEvent.label}</h2>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              <p>Jan 18, 2025 @ 14:12:31</p>
            </EuiText>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <SignificantEventChildFlyoutBody event={selectedEvent} />
          </EuiFlyoutBody>
        </EuiFlyout>
      ) : null}
    </EuiFlyout>
  );
};
