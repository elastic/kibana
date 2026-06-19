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
import { changeTypeLabel, DETECTION_KIND_LABELS } from '../shared/translations';
import { DETECTION_KIND_COLORS } from '../shared/constants';
import { useFetchDetectionHistory } from '../../../../../hooks/sig_events/use_fetch_detections';
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

interface DetectionFlyoutProps {
  detection: Detection;
  onClose: () => void;
}

export const DetectionFlyout = ({ detection, onClose }: DetectionFlyoutProps) => {
  const titleId = useGeneratedHtmlId();
  const { data: historyData, isLoading: isHistoryLoading } = useFetchDetectionHistory(
    detection.detection_id
  );

  const diagnostics = useMemo(
    () => [
      {
        title: i18n.translate('xpack.streams.detectionFlyout.detectedAt', {
          defaultMessage: 'Detected at',
        }),
        description: formatTimestamp(detection['@timestamp']),
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
            <EuiBadge color={DETECTION_KIND_COLORS[detection.kind] ?? 'default'}>
              {DETECTION_KIND_LABELS[detection.kind] ?? detection.kind}
            </EuiBadge>
          </EuiFlexItem>
          {detection.processed && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="success">{DETECTION_KIND_LABELS.handled}</EuiBadge>
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
        ) : !historyData?.hits.length ? (
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.streams.detectionFlyout.noHistory', {
              defaultMessage: 'No history available.',
            })}
          </EuiText>
        ) : (
          <EuiTimeline
            aria-label={i18n.translate('xpack.streams.detectionFlyout.timeline.title', {
              defaultMessage: 'Timeline',
            })}
            gutterSize="m"
          >
            {historyData.hits.map((entry, idx) => (
              <EuiTimelineItem
                key={`${entry['@timestamp']}-${idx}`}
                icon="dot"
                iconAriaLabel={DETECTION_KIND_LABELS[entry.kind] ?? entry.kind}
                verticalAlign="top"
              >
                <EuiFlexGroup gutterSize="xs" alignItems="center" wrap responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={DETECTION_KIND_COLORS[entry.kind] ?? 'hollow'}>
                      {DETECTION_KIND_LABELS[entry.kind] ?? entry.kind}
                    </EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {formatTimestamp(entry['@timestamp'])}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiTimelineItem>
            ))}
          </EuiTimeline>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
