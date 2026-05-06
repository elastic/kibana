/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IBasePath } from '@kbn/core-http-browser';
import { paths } from '../../../../constants';
import { formatSeriesLabel } from '../../../../utils/format_series_label';

const MAX_LABEL_WIDTH_PX = 220;

export interface AlertTimelineSeriesLabelProps {
  groupHash: string;
  groupingValues: Record<string, string | null>;
  episodeCount: number;
  ruleId: string;
  gteMs: number;
  lteMs: number;
  basePath: IBasePath;
}

/**
 * Two-line meta for an alert timeline row: the formatted series label
 * (clickable, deep-links into the episodes list pre-filtered to this
 * `groupHash`) on top, with the episode count for the visible window below.
 */
export const AlertTimelineSeriesLabel: React.FC<AlertTimelineSeriesLabelProps> = ({
  groupHash,
  groupingValues,
  episodeCount,
  ruleId,
  gteMs,
  lteMs,
  basePath,
}) => {
  const label = formatSeriesLabel(groupHash, groupingValues);

  const href = useMemo(
    () =>
      basePath.prepend(
        paths.alertEpisodesList({
          filters: {
            ruleId,
            groupHash,
            groupingValues,
          },
          timeRange: {
            from: new Date(gteMs).toISOString(),
            to: new Date(lteMs).toISOString(),
          },
        })
      ),
    [basePath, ruleId, groupHash, groupingValues, gteMs, lteMs]
  );

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
        <EuiText
          size="xs"
          className="eui-textTruncate"
          style={{ maxWidth: MAX_LABEL_WIDTH_PX }}
          data-test-subj="alertTimelineSeriesLabel"
        >
          <EuiLink
            href={href}
            target="_blank"
            rel="noopener"
            data-test-subj="alertTimelineSeriesLabelLink"
          >
            <strong>{label}</strong>
          </EuiLink>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" data-test-subj="alertTimelineSeriesEpisodeCount">
          {episodeCountLabel}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
