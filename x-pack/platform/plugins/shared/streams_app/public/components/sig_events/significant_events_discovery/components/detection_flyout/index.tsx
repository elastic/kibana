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

const confidenceLabel = (pValue?: number): string => {
  if (pValue === undefined || pValue === null) return '-';
  if (pValue < 0.001)
    return i18n.translate('xpack.streams.detectionFlyout.confidence.high', {
      defaultMessage: 'High (p={pValue})',
      values: { pValue: pValue.toExponential(2) },
    });
  if (pValue < 0.05)
    return i18n.translate('xpack.streams.detectionFlyout.confidence.medium', {
      defaultMessage: 'Medium (p={pValue})',
      values: { pValue: pValue.toFixed(4) },
    });
  return i18n.translate('xpack.streams.detectionFlyout.confidence.low', {
    defaultMessage: 'Low (p={pValue})',
    values: { pValue: pValue.toFixed(4) },
  });
};

const KIND_LABELS: Record<string, string> = {
  detection: i18n.translate('xpack.streams.detectionFlyout.status.active', {
    defaultMessage: 'Active',
  }),
  quiet: i18n.translate('xpack.streams.detectionFlyout.status.quiet', {
    defaultMessage: 'Quiet',
  }),
};

const KIND_COLORS: Record<string, string> = { detection: 'warning', quiet: 'default' };

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
        title: i18n.translate('xpack.streams.detectionFlyout.confidence', {
          defaultMessage: 'Confidence',
        }),
        description: confidenceLabel(detection.detection_evidence?.p_value),
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
          {detection.processed && (
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
          <EuiFlexGroup direction="column" gutterSize="s">
            {history.map((entry, idx) => (
              <EuiFlexItem key={`${entry['@timestamp']}-${idx}`}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">{formatTimestamp(entry['@timestamp'])}</EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">{timelineLabel(entry, history[idx - 1])}</EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
