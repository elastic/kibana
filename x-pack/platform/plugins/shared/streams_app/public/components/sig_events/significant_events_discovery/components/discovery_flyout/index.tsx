/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDescriptionList,
  EuiLoadingSpinner,
  EuiTimeline,
  EuiTimelineItem,
  EuiListGroup,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Discovery } from '@kbn/streams-schema';
import { formatTimestamp } from '../../../../../util/formatters';

const KIND_LABELS: Record<string, string> = {
  finding: i18n.translate('xpack.streams.discoveryFlyout.kind.finding', {
    defaultMessage: 'Finding',
  }),
  clearance: i18n.translate('xpack.streams.discoveryFlyout.kind.clearance', {
    defaultMessage: 'Cleared',
  }),
};

const KIND_COLORS: Record<string, string> = { finding: 'warning', clearance: 'success' };

const CHANGE_TYPE_LABELS: Record<string, string> = {
  distribution_change: i18n.translate('xpack.streams.discoveryFlyout.changeType.distribution', {
    defaultMessage: 'Distribution shift',
  }),
  spike: i18n.translate('xpack.streams.discoveryFlyout.changeType.spike', {
    defaultMessage: 'Spike',
  }),
  dip: i18n.translate('xpack.streams.discoveryFlyout.changeType.dip', {
    defaultMessage: 'Dip',
  }),
  step_change: i18n.translate('xpack.streams.discoveryFlyout.changeType.step', {
    defaultMessage: 'Step change',
  }),
  stationary: i18n.translate('xpack.streams.discoveryFlyout.changeType.stationary', {
    defaultMessage: 'Returned to baseline',
  }),
};

// history is sorted @timestamp ASC — a finding after a clearance means a re-opened episode.
const timelineLabel = (entry: Discovery, prev: Discovery | undefined): string => {
  const criticality = entry.criticality ?? '-';
  switch (entry.kind) {
    case 'finding':
      if (prev?.kind === 'clearance') {
        return i18n.translate('xpack.streams.discoveryFlyout.transition.reopened', {
          defaultMessage: 'Re-opened — Criticality {criticality}',
          values: { criticality },
        });
      }
      return i18n.translate('xpack.streams.discoveryFlyout.transition.found', {
        defaultMessage: 'Found — Criticality {criticality}',
        values: { criticality },
      });
    case 'clearance':
      return i18n.translate('xpack.streams.discoveryFlyout.transition.cleared', {
        defaultMessage: 'Cleared — Criticality {criticality}',
        values: { criticality },
      });
    default:
      return entry.kind;
  }
};

interface DiscoveryFlyoutProps {
  discovery: Discovery;
  history: Discovery[];
  isHistoryLoading: boolean;
  onClose: () => void;
}

export const DiscoveryFlyout = ({
  discovery,
  history,
  isHistoryLoading,
  onClose,
}: DiscoveryFlyoutProps) => {
  const titleId = useGeneratedHtmlId();

  const streams = useMemo(() => {
    const names = [
      ...new Set(
        (discovery.detections ?? []).map((d) => d.stream_name).filter((s): s is string => !!s)
      ),
    ];
    return names.join(', ') || '-';
  }, [discovery]);

  const diagnostics = useMemo(
    () => [
      {
        title: i18n.translate('xpack.streams.discoveryFlyout.criticality', {
          defaultMessage: 'Criticality',
        }),
        description: discovery.criticality != null ? String(discovery.criticality) : '-',
      },
      {
        title: i18n.translate('xpack.streams.discoveryFlyout.confidence', {
          defaultMessage: 'Confidence',
        }),
        description: discovery.confidence != null ? String(discovery.confidence) : '-',
      },
      {
        title: i18n.translate('xpack.streams.discoveryFlyout.streams', {
          defaultMessage: 'Streams',
        }),
        description: streams,
      },
    ],
    [discovery, streams]
  );

  return (
    <EuiFlyout onClose={onClose} size="m" aria-labelledby={titleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
          <EuiFlexItem grow={false}>
            <EuiBadge color={KIND_COLORS[discovery.kind] ?? 'default'}>
              {KIND_LABELS[discovery.kind] ?? discovery.kind}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiTitle size="m">
          <h2 id={titleId}>{discovery.title}</h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          {discovery.discovery_slug}
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiDescriptionList
          type="column"
          columnWidths={[1, 2]}
          listItems={diagnostics}
          compressed
        />

        <EuiSpacer size="l" />

        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.streams.discoveryFlyout.summary', {
              defaultMessage: 'Summary',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">{discovery.summary}</EuiText>

        <EuiSpacer size="l" />

        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.streams.discoveryFlyout.rootCause', {
              defaultMessage: 'Root Cause',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">{discovery.root_cause}</EuiText>

        <EuiSpacer size="l" />

        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.streams.discoveryFlyout.detectionsSection', {
              defaultMessage: 'Detections',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiListGroup maxWidth={false}>
          {(discovery.detections ?? []).map((det, idx) => (
            <EuiFlexGroup
              key={det.detection_id ?? idx}
              gutterSize="s"
              alignItems="flexStart"
              responsive={false}
              style={{ padding: '4px 0' }}
            >
              <EuiFlexItem grow={false} style={{ paddingTop: 2 }}>
                <EuiBadge color="hollow">
                  {CHANGE_TYPE_LABELS[det.change_point_type ?? ''] ?? det.change_point_type ?? '-'}
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>{det.rule_name}</strong>
                </EuiText>
                <EuiText size="xs" color="subdued">
                  {[
                    det.stream_name,
                    det.alert_count != null
                      ? i18n.translate('xpack.streams.discoveryFlyout.alertCount', {
                          defaultMessage: '{count} alerts',
                          values: { count: det.alert_count },
                        })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ))}
        </EuiListGroup>

        <EuiSpacer size="l" />

        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.streams.discoveryFlyout.timeline', {
              defaultMessage: 'Timeline',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        {isHistoryLoading ? (
          <EuiLoadingSpinner size="m" />
        ) : history.length === 0 ? (
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.streams.discoveryFlyout.noHistory', {
              defaultMessage: 'No history available.',
            })}
          </EuiText>
        ) : (
          <EuiTimeline
            aria-label={i18n.translate(
              'xpack.streams.discoveryFlyout.euiTimeline.discoveryHistoryLabel',
              { defaultMessage: 'Discovery history' }
            )}
            gutterSize="m"
          >
            {history.map((entry, idx) => (
              <EuiTimelineItem
                key={`${entry['@timestamp']}-${idx}`}
                icon="dot"
                iconAriaLabel={KIND_LABELS[entry.kind] ?? entry.kind}
                verticalAlign="top"
              >
                <EuiFlexGroup gutterSize="xs" alignItems="center" wrap responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={KIND_COLORS[entry.kind] ?? 'hollow'}>
                      {KIND_LABELS[entry.kind] ?? entry.kind}
                    </EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {formatTimestamp(entry['@timestamp'])}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiText size="s">
                  <p>{timelineLabel(entry, history[idx - 1])}</p>
                </EuiText>
              </EuiTimelineItem>
            ))}
          </EuiTimeline>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
