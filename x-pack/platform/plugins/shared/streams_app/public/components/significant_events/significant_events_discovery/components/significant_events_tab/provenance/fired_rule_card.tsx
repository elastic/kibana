/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LifecycleDetection } from '@kbn/significant-events-schema';
import { SparkPlot } from '../../../../../spark_plot';
import type { StreamQueryStats } from '../../../../../../hooks/significant_events/use_fetch_query_occurrence_stats';
import { formatTimestamp } from '../../../../../../util/formatters';

const CHANGE_POINT_LABELS: Record<string, string> = {
  spike: i18n.translate('xpack.streams.sigEventsTab.provenance.changePointSpike', {
    defaultMessage: 'Spike',
  }),
  dip: i18n.translate('xpack.streams.sigEventsTab.provenance.changePointDip', {
    defaultMessage: 'Dip',
  }),
  step_change: i18n.translate('xpack.streams.sigEventsTab.provenance.changePointStepChange', {
    defaultMessage: 'Step change',
  }),
  trend_change: i18n.translate('xpack.streams.sigEventsTab.provenance.changePointTrendChange', {
    defaultMessage: 'Trend change',
  }),
  distribution_change: i18n.translate(
    'xpack.streams.sigEventsTab.provenance.changePointDistributionChange',
    { defaultMessage: 'Distribution change' }
  ),
};

const changePointLabel = (type: string): string => CHANGE_POINT_LABELS[type] ?? type;

const QUIET_LABEL = i18n.translate('xpack.streams.sigEventsTab.provenance.quietBadge', {
  defaultMessage: 'Returned to baseline',
});

const formatPValue = (pValue: number): string => {
  if (pValue === 0) return 'p ≈ 0';
  return pValue < 0.001 ? `p = ${pValue.toExponential(1)}` : `p = ${pValue.toFixed(3)}`;
};

export interface FiredRuleCardProps {
  detection: LifecycleDetection;
  /** Enriched change-point evidence taken from the discovery that consumed this detection. */
  pValue?: number;
  alertCount?: number;
  /** Occurrence series of the rule's backing query around the detection window. */
  stats?: StreamQueryStats;
}

/**
 * One fired rule in the provenance story: which rule fired, what kind of change point was
 * detected in its alert pattern (with statistical significance), and the occurrence series
 * around the detection with the detection moment annotated.
 */
export const FiredRuleCard: React.FC<FiredRuleCardProps> = ({
  detection,
  pValue,
  alertCount,
  stats,
}) => {
  const { euiTheme } = useEuiTheme();
  const detectionMillis = Date.parse(detection['@timestamp']);
  const hasSeries = (stats?.occurrences.length ?? 0) > 0;

  return (
    <EuiPanel hasBorder paddingSize="s" data-test-subj="provenanceFiredRuleCard">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiIcon type="bell" size="s" color={euiTheme.colors.textSubdued} />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiText size="s">
            <strong>{detection.rule_name ?? '-'}</strong>
          </EuiText>
        </EuiFlexItem>
        {detection.kind === 'quiet' ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="success" iconType="check">
              {QUIET_LABEL}
            </EuiBadge>
          </EuiFlexItem>
        ) : (
          detection.change_point_type && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="warning" iconType="visLine">
                {changePointLabel(detection.change_point_type)}
              </EuiBadge>
            </EuiFlexItem>
          )
        )}
        {detection.stream_name && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{detection.stream_name}</EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        {[
          i18n.translate('xpack.streams.sigEventsTab.provenance.detectedAt', {
            defaultMessage: 'Detected {timestamp}',
            values: { timestamp: formatTimestamp(detection['@timestamp']) },
          }),
          pValue != null ? formatPValue(pValue) : undefined,
          alertCount != null
            ? i18n.translate('xpack.streams.sigEventsTab.provenance.alertCount', {
                defaultMessage: '{count} alerts',
                values: { count: alertCount },
              })
            : undefined,
        ]
          .filter(Boolean)
          .join(' · ')}
      </EuiText>
      {hasSeries && stats && (
        <>
          <EuiSpacer size="s" />
          <SparkPlot
            id={`provenance-${detection.detection_id}`}
            name={detection.rule_name}
            type="bar"
            timeseries={stats.occurrences}
            height={96}
            annotations={
              Number.isNaN(detectionMillis)
                ? []
                : [
                    {
                      id: `detection-${detection.detection_id}`,
                      x: detectionMillis,
                      color: euiTheme.colors.accent,
                      icon: <EuiIcon type="dot" color={euiTheme.colors.accent} />,
                      label:
                        detection.kind === 'quiet'
                          ? QUIET_LABEL
                          : i18n.translate(
                              'xpack.streams.sigEventsTab.provenance.changePointAnnotation',
                              { defaultMessage: 'Change point detected' }
                            ),
                    },
                  ]
            }
          />
        </>
      )}
    </EuiPanel>
  );
};
