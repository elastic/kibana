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
  EuiListGroup,
  EuiLoadingSpinner,
  EuiTimeline,
  EuiTimelineItem,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Discovery } from '@kbn/streams-schema';
import { formatTimestamp } from '../../../../../util/formatters';
import { CHANGE_TYPE_LABELS, DISCOVERY_KIND_LABELS } from '../shared/translations';
import { DISCOVERY_KIND_COLORS } from '../shared/constants';

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
        description: discovery.confidence != null ? `${discovery.confidence}%` : '-',
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

  const isCleared = discovery.kind === 'clearance';

  return (
    <EuiFlyout onClose={onClose} size="m" aria-labelledby={titleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
          {isCleared && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="success">
                {i18n.translate('xpack.streams.discoveryFlyout.cleared', {
                  defaultMessage: 'Cleared',
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        {isCleared && <EuiSpacer size="s" />}
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
                    det.detected_at ? formatTimestamp(det.detected_at) : null,
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
        ) : (
          <EuiTimeline
            aria-label={i18n.translate('xpack.streams.discoveryFlyout.timeline.title', {
              defaultMessage: 'Timeline',
            })}
            gutterSize="m"
          >
            {history.map((entry, idx) => {
              const prevEntry = history[idx - 1];
              const isReopened = entry.kind === 'finding' && prevEntry?.kind === 'clearance';
              const label =
                entry.kind === 'finding'
                  ? isReopened
                    ? i18n.translate('xpack.streams.discoveryFlyout.timeline.reopened', {
                        defaultMessage: 'Re-opened — Criticality {criticality}',
                        values: { criticality: entry.criticality ?? '-' },
                      })
                    : i18n.translate('xpack.streams.discoveryFlyout.timeline.found', {
                        defaultMessage: 'Found — Criticality {criticality}',
                        values: { criticality: entry.criticality ?? '-' },
                      })
                  : i18n.translate('xpack.streams.discoveryFlyout.timeline.cleared', {
                      defaultMessage: 'Cleared — Criticality {criticality}',
                      values: { criticality: entry.criticality ?? '-' },
                    });

              return (
                <EuiTimelineItem
                  key={`${entry.discovery_id}-${idx}`}
                  icon="dot"
                  iconAriaLabel={entry.kind}
                  verticalAlign="top"
                >
                  <EuiFlexGroup gutterSize="xs" alignItems="center" wrap responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color={DISCOVERY_KIND_COLORS[entry.kind]}>
                        {DISCOVERY_KIND_LABELS[entry.kind]}
                      </EuiBadge>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {formatTimestamp(entry['@timestamp'])}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiText size="s">
                    <p>{label}</p>
                  </EuiText>
                </EuiTimelineItem>
              );
            })}
          </EuiTimeline>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
