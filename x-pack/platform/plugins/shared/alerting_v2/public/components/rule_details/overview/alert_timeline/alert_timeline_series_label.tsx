/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { formatSeriesLabel, formatSeriesLabelValues } from '../../../../utils/format_series_label';

export interface AlertTimelineSeriesLabelProps {
  groupHash: string;
  groupingValues: Record<string, string | null>;
  episodeCount: number;
}

export const AlertTimelineSeriesLabel: React.FC<AlertTimelineSeriesLabelProps> = ({
  groupHash,
  groupingValues,
  episodeCount,
}) => {
  const displayLabel = formatSeriesLabelValues(groupHash, groupingValues);
  const tooltipLabel = formatSeriesLabel(groupHash, groupingValues);

  const episodeCountLabel = i18n.translate(
    'xpack.alertingV2.alertTimeline.seriesLabel.episodeCount',
    {
      defaultMessage: '{count, plural, one {# episode} other {# episodes}}',
      values: { count: episodeCount },
    }
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="none" responsive={false} alignItems="flexStart">
      <EuiFlexItem grow={false}>
        <EuiToolTip content={tooltipLabel} display="block">
          <EuiText size="xs" className="eui-textTruncate" data-test-subj="alertTimelineSeriesLabel">
            <strong>{displayLabel}</strong>
          </EuiText>
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" data-test-subj="alertTimelineSeriesEpisodeCount">
          {episodeCountLabel}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
