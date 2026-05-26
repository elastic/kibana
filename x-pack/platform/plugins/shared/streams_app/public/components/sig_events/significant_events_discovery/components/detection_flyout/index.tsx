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
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Detection } from '@kbn/streams-schema';
import { formatTimestamp } from '../../../../../util/formatters';

const CHANGE_TYPE_LABELS: Record<string, string> = {
  distribution_change: i18n.translate('xpack.streams.detectionFlyout.changeType.distribution', {
    defaultMessage: 'Distribution shift',
  }),
  spike: i18n.translate('xpack.streams.detectionFlyout.changeType.spike', {
    defaultMessage: 'Spike',
  }),
  dip: i18n.translate('xpack.streams.detectionFlyout.changeType.dip', {
    defaultMessage: 'Dip',
  }),
  step_change: i18n.translate('xpack.streams.detectionFlyout.changeType.step', {
    defaultMessage: 'Step change',
  }),
  stationary: i18n.translate('xpack.streams.detectionFlyout.changeType.stationary', {
    defaultMessage: 'Returned to baseline',
  }),
};

const changeTypeLabel = (type?: string) => (type ? CHANGE_TYPE_LABELS[type] ?? type : '-');

const formatPValue = (pValue?: number | string): string => {
  if (pValue === undefined || pValue === null) return '-';
  const n = Number(pValue);
  if (isNaN(n)) return '-';
  if (n === 0)
    return i18n.translate('xpack.streams.detectionFlyout.pValue.zero', { defaultMessage: 'p=0' });
  if (n < 0.0001)
    return i18n.translate('xpack.streams.detectionFlyout.pValue.scientific', {
      defaultMessage: 'p={value}',
      values: { value: n.toExponential(2) },
    });
  return i18n.translate('xpack.streams.detectionFlyout.pValue.decimal', {
    defaultMessage: 'p={value}',
    values: { value: n.toFixed(4) },
  });
};

const KIND_LABELS: Record<string, string> = {
  detection: i18n.translate('xpack.streams.detectionFlyout.status.active', {
    defaultMessage: 'Active',
  }),
  quiet: i18n.translate('xpack.streams.detectionFlyout.status.quiet', {
    defaultMessage: 'Quiet',
  }),
  handled: i18n.translate('xpack.streams.detectionFlyout.status.investigated', {
    defaultMessage: 'Investigated',
  }),
};

const KIND_COLORS: Record<string, string> = {
  detection: 'warning',
  quiet: 'default',
  handled: 'success',
};

// history is sorted @timestamp ASC — a kind:detection after another kind:detection is a type revision.
const timelineLabel = (entry: Detection, prev: Detection | undefined): string => {
  const type = changeTypeLabel(entry.detection_evidence?.change_point_type);
  switch (entry.kind) {
    case 'detection':
      if (prev?.kind === 'detection') {
        return i18n.translate('xpack.streams.detectionFlyout.transition.typeChanged', {
          defaultMessage: 'Type changed — {type}',
          values: { type },
        });
      }
      return i18n.translate('xpack.streams.detectionFlyout.transition.detected', {
        defaultMessage: 'Detected — {type}',
        values: { type },
      });
    case 'quiet':
      return i18n.translate('xpack.streams.detectionFlyout.transition.quiet', {
        defaultMessage: 'Returned to baseline',
      });
    case 'handled':
      return i18n.translate('xpack.streams.detectionFlyout.transition.handled', {
        defaultMessage: 'Investigated by discovery',
      });
    default:
      return entry.kind;
  }
};

interface DetectionFlyoutProps {
  detection: Detection;
  history: Detection[];
  isHistoryLoading: boolean;
  onClose: () => void;
}

export const DetectionFlyout = ({
  detection,
  history,
  isHistoryLoading,
  onClose,
}: DetectionFlyoutProps) => {
  const titleId = useGeneratedHtmlId();

  // The episode is processed when the latest kind:handled doc is on or after
  // the latest kind:detection/quiet doc — mirrors getProcessedIds server logic.
  const isProcessed = isHistoryLoading
    ? detection.processed
    : (() => {
        const latestStateTs = [...history]
          .reverse()
          .find((e) => e.kind === 'detection' || e.kind === 'quiet')?.['@timestamp'];
        return latestStateTs
          ? history.some((e) => e.kind === 'handled' && e['@timestamp'] >= latestStateTs)
          : history.some((e) => e.kind === 'handled');
      })();

  const diagnostics = useMemo(
    () => [
      {
        title: i18n.translate('xpack.streams.detectionFlyout.detectedAt', {
          defaultMessage: 'Detected at',
        }),
        description: formatTimestamp(detection.detected_at ?? detection['@timestamp']),
      },
      {
        title: i18n.translate('xpack.streams.detectionFlyout.changeType', {
          defaultMessage: 'Change type',
        }),
        description: changeTypeLabel(detection.detection_evidence?.change_point_type),
      },
      {
        title: i18n.translate('xpack.streams.detectionFlyout.significance', {
          defaultMessage: 'Statistical significance',
        }),
        description: formatPValue(detection.detection_evidence?.p_value),
      },
      {
        title: i18n.translate('xpack.streams.detectionFlyout.peakAlerts', {
          defaultMessage: 'Peak alerts',
        }),
        description: String(detection.peak_alert_count ?? '-'),
      },
      {
        title: i18n.translate('xpack.streams.detectionFlyout.stream', {
          defaultMessage: 'Stream',
        }),
        description: detection.stream_name ?? '-',
      },
    ],
    [detection]
  );

  return (
    <EuiFlyout onClose={onClose} size="m" aria-labelledby={titleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
          <EuiFlexItem grow={false}>
            <EuiBadge color={KIND_COLORS[detection.kind] ?? 'default'}>
              {KIND_LABELS[detection.kind] ?? detection.kind}
            </EuiBadge>
          </EuiFlexItem>
          {isProcessed && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="success">
                {i18n.translate('xpack.streams.detectionFlyout.investigated', {
                  defaultMessage: 'Investigated',
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiTitle size="m">
          <h2 id={titleId}>{detection.rule_name}</h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          {detection.stream_name}
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
            {i18n.translate('xpack.streams.detectionFlyout.timeline', {
              defaultMessage: 'Timeline',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        {isHistoryLoading ? (
          <EuiLoadingSpinner size="m" />
        ) : (
          <EuiTimeline
            aria-label={i18n.translate(
              'xpack.streams.detectionFlyout.euiTimeline.detectionHistoryLabel',
              { defaultMessage: 'Detection history' }
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
