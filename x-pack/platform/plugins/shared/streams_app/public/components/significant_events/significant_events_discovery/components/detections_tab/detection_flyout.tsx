/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTimeline,
  EuiTimelineItem,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Detection } from '@kbn/significant-events-schema';
import { FlyoutMetadataCard } from '../../../../flyout_components/flyout_metadata_card';
import { FlyoutToolbarHeader } from '../../../../flyout_components/flyout_toolbar_header';
import { InfoPanel } from '../../../../info_panel';
import { useFetchDetectionHistory } from '../../../../../hooks/significant_events/use_fetch_detections';
import { formatTimestamp } from '../../../../../util/formatters';
import { changeTypeLabel } from '../shared/translations';

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
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'detectionFlyoutTitle' });
  const { data: historyData, isLoading: isHistoryLoading } = useFetchDetectionHistory(
    detection.rule_uuid
  );

  const status = useMemo(
    () =>
      detection.processed
        ? { label: STATUS_PROCESSED_LABEL, color: 'success' as const }
        : { label: STATUS_PENDING_LABEL, color: 'hollow' as const },
    [detection.processed]
  );

  const generalInfoItems = useMemo(() => {
    const changeType = detection.change_point_type;
    const pValue = detection.p_value;

    return [
      {
        title: TIMESTAMP_LABEL,
        description: <EuiText size="s">{formatTimestamp(detection['@timestamp'])}</EuiText>,
      },
      ...(changeType
        ? [
            {
              title: CHANGE_LABEL,
              description: <EuiBadge color="hollow">{changeTypeLabel(changeType)}</EuiBadge>,
            },
          ]
        : []),
      ...(pValue !== undefined
        ? [
            {
              title: STATISTICAL_SIGNIFICANCE_LABEL,
              description: <EuiText size="s">{formatPValue(pValue)}</EuiText>,
            },
          ]
        : []),
    ];
  }, [detection]);

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      type="push"
      ownFocus={false}
      size="40%"
      hideCloseButton
    >
      {/* First header: minimal toolbar with close button */}
      <FlyoutToolbarHeader>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={CLOSE_BUTTON_ARIA_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              data-test-subj="detectionFlyoutCloseButton"
              iconType="cross"
              aria-label={CLOSE_BUTTON_ARIA_LABEL}
              onClick={onClose}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </FlyoutToolbarHeader>

      {/* Second header: title and metadata cards */}
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={flyoutTitleId}>{detection.rule_name}</h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s" responsive={false} wrap>
          <EuiFlexItem>
            <FlyoutMetadataCard title={STATUS_LABEL}>
              <EuiToolTip content={STATUS_TOOLTIP}>
                <EuiBadge color={status.color}>{status.label}</EuiBadge>
              </EuiToolTip>
            </FlyoutMetadataCard>
          </EuiFlexItem>
          {detection.stream_name && (
            <EuiFlexItem>
              <FlyoutMetadataCard title={STREAM_LABEL}>
                <EuiBadge color="hollow" iconType="productStreamsClassic" iconSide="left">
                  {detection.stream_name}
                </EuiBadge>
              </FlyoutMetadataCard>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <InfoPanel title={GENERAL_INFORMATION_TITLE}>
          {generalInfoItems.map((listItem, index) => (
            <React.Fragment key={listItem.title}>
              <EuiDescriptionList
                type="column"
                columnWidths={[1, 2]}
                compressed
                listItems={[listItem]}
              />
              {index < generalInfoItems.length - 1 && <EuiHorizontalRule margin="m" />}
            </React.Fragment>
          ))}
        </InfoPanel>

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
            {historyData.hits.map((entry, idx) => {
              // Each history entry is a change-point observation — rendered as its change
              // type, never as a lifecycle state (lifecycle is not derived from change type).
              const entryLabel = changeTypeLabel(entry.change_point_type);
              return (
                <EuiTimelineItem
                  key={`${entry['@timestamp']}-${idx}`}
                  icon="dot"
                  iconAriaLabel={entryLabel}
                  verticalAlign="top"
                >
                  <EuiFlexGroup gutterSize="xs" alignItems="center" wrap responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">{entryLabel}</EuiBadge>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color={entry.processed ? 'success' : 'hollow'}>
                        {entry.processed ? STATUS_PROCESSED_LABEL : STATUS_PENDING_LABEL}
                      </EuiBadge>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {formatTimestamp(entry['@timestamp'])}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiTimelineItem>
              );
            })}
          </EuiTimeline>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

const CLOSE_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.streams.detectionFlyout.closeButtonAriaLabel',
  { defaultMessage: 'Close' }
);

const GENERAL_INFORMATION_TITLE = i18n.translate(
  'xpack.streams.detectionFlyout.generalInformationTitle',
  { defaultMessage: 'General information' }
);

const STATUS_LABEL = i18n.translate('xpack.streams.detectionFlyout.statusLabel', {
  defaultMessage: 'Discovery',
});

const STATUS_TOOLTIP = i18n.translate('xpack.streams.detectionFlyout.statusTooltip', {
  defaultMessage: 'Whether the discovery pipeline has ingested this detection.',
});

const STREAM_LABEL = i18n.translate('xpack.streams.detectionFlyout.streamLabel', {
  defaultMessage: 'Stream',
});

const TIMESTAMP_LABEL = i18n.translate('xpack.streams.detectionFlyout.timestampLabel', {
  defaultMessage: 'Timestamp',
});

const CHANGE_LABEL = i18n.translate('xpack.streams.detectionFlyout.changeLabel', {
  defaultMessage: 'Change',
});

const STATISTICAL_SIGNIFICANCE_LABEL = i18n.translate(
  'xpack.streams.detectionFlyout.statisticalSignificanceLabel',
  { defaultMessage: 'Statistical significance' }
);

const STATUS_PROCESSED_LABEL = i18n.translate('xpack.streams.detectionFlyout.status.processed', {
  defaultMessage: 'Processed',
});

const STATUS_PENDING_LABEL = i18n.translate('xpack.streams.detectionFlyout.status.pending', {
  defaultMessage: 'Pending',
});
