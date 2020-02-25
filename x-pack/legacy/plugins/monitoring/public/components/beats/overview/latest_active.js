/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function LatestActive({ latestActive }) {
  const rangeMap = {
    last1m: i18n.translate('xpack.monitoring.beats.overview.latestActive.last1MinuteLabel', {
      defaultMessage: 'Last 1 minute',
    }),
    last5m: i18n.translate('xpack.monitoring.beats.overview.latestActive.last5MinutesLabel', {
      defaultMessage: 'Last 5 minutes',
    }),
    last20m: i18n.translate('xpack.monitoring.beats.overview.latestActive.last20MinutesLabel', {
      defaultMessage: 'Last 20 minutes',
    }),
    last1h: i18n.translate('xpack.monitoring.beats.overview.latestActive.last1HourLabel', {
      defaultMessage: 'Last 1 hour',
    }),
    last1d: i18n.translate('xpack.monitoring.beats.overview.latestActive.last1DayLabel', {
      defaultMessage: 'Last 1 day',
    }),
  };

  const activity = latestActive.map(({ range, count }) => ({
    range: rangeMap[range],
    count,
  }));

  return (
    <EuiBasicTable
      items={activity}
      columns={[
        {
          field: 'range',
          name: '',
        },
        {
          field: 'count',
          dataType: 'number',
          name: '',
        },
      ]}
    />
  );
}

LatestActive.propTypes = {
  latestActive: PropTypes.arrayOf(
    PropTypes.shape({
      range: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
    })
  ).isRequired,
};
