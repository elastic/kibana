/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiCopy, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { formatSeriesLabel } from '../../../../utils/format_series_label';

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
  const label = formatSeriesLabel(groupHash, groupingValues);

  const episodeCountLabel = i18n.translate(
    'xpack.alertingV2.alertTimeline.seriesLabel.episodeCount',
    {
      defaultMessage: '{count, plural, one {# episode} other {# episodes}}',
      values: { count: episodeCount },
    }
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
          <EuiFlexItem grow={false} style={{ minWidth: 0 }}>
            <EuiText
              size="xs"
              className="eui-textTruncate"
              data-test-subj="alertTimelineSeriesLabel"
            >
              <strong>{label}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={groupHash}>
              {(copy) => (
                <EuiButtonIcon
                  iconType="copyClipboard"
                  iconSize="s"
                  color="text"
                  aria-label={i18n.translate(
                    'xpack.alertingV2.alertTimeline.seriesLabel.copyHash',
                    { defaultMessage: 'Copy group hash' }
                  )}
                  onClick={copy}
                  data-test-subj="alertTimelineSeriesCopyHash"
                />
              )}
            </EuiCopy>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" data-test-subj="alertTimelineSeriesEpisodeCount">
          {episodeCountLabel}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
