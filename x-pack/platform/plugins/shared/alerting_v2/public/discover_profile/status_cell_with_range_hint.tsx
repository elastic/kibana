/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import { EpisodeStatusCell } from '@kbn/alerting-v2-episodes-ui/components/episodes_table_cell_renderers';
import { formatDateTime } from '@kbn/alerting-v2-episodes-ui/utils/format_date_time';

/** A range that ends this close to now counts as ending now, since "now" resolves at fetch time. */
const RANGE_END_TOLERANCE_MS = 60_000;

/**
 * Whether the status of an episode may have changed after the time range. The range bounds the
 * alert events, so the status comes from the last event in it. An inactive episode is closed for
 * good, since a new alert opens a new episode, so only the other statuses can be outdated.
 */
export const isStatusPossiblyOutdated = ({
  status,
  rangeEnd,
  now,
}: {
  status: unknown;
  rangeEnd: string | undefined;
  now: number;
}): boolean => {
  if (status == null || status === ALERT_EPISODE_STATUS.INACTIVE || !rangeEnd) return false;
  const rangeEndMs = Date.parse(rangeEnd);
  return !Number.isNaN(rangeEndMs) && rangeEndMs < now - RANGE_END_TOLERANCE_MS;
};

export type EpisodeStatusCellWithRangeHintProps = React.ComponentProps<typeof EpisodeStatusCell> & {
  /** End of the time range the table was loaded with, as an absolute date. */
  rangeEnd: string | undefined;
  dateFormat: string | undefined;
};

/** The episode status cell, marked when the status may have changed after the time range. */
export const EpisodeStatusCellWithRangeHint = ({
  rangeEnd,
  dateFormat,
  ...props
}: EpisodeStatusCellWithRangeHintProps) => {
  const { row, columnId } = props;
  const status = row.flattened[columnId];

  if (!rangeEnd || !isStatusPossiblyOutdated({ status, rangeEnd, now: Date.now() })) {
    return <EpisodeStatusCell {...props} />;
  }

  return (
    <EpisodeStatusCell
      {...props}
      statusAppend={
        <EuiIconTip
          type="clock"
          size="s"
          // Takes the badge text color, like the status label.
          color="inherit"
          // A flex anchor centers the icon, an inline one sits on the text baseline.
          anchorProps={{ css: { display: 'flex' } }}
          content={i18n.translate('xpack.alertingV2.discoverProfile.statusAsOfRangeEndTooltip', {
            defaultMessage:
              'Status as of {rangeEnd}. It may have changed since. To see the latest status, end the time range at now or open the alert details.',
            values: { rangeEnd: formatDateTime(rangeEnd, dateFormat) },
          })}
          aria-label={i18n.translate('xpack.alertingV2.discoverProfile.statusAsOfRangeEndLabel', {
            defaultMessage: 'Status may be outdated',
          })}
          iconProps={{ 'data-test-subj': 'alertingV2DiscoverStatusOutdatedHint' }}
        />
      }
    />
  );
};
