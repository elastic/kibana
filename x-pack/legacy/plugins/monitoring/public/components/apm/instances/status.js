/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import moment from 'moment';
import { SummaryStatus } from '../../summary_status';
import { ApmStatusIcon } from '../status_icon';
import { formatMetric } from '../../../lib/format_number';
import { formatTimestampToDuration } from '../../../../common';
import { CALCULATE_DURATION_SINCE } from '../../../../common/constants';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

export function Status({ stats }) {
  const {
    apms: {
      total
    },
    totalEvents,
    timeOfLastEvent,
  } = stats;

  const metrics = [
    {
      label: i18n.translate('xpack.monitoring.apm.instances.status.serversLabel', {
        defaultMessage: 'Servers'
      }),
      value: total,
      'data-test-subj': 'total'
    },
    {
      label: i18n.translate('xpack.monitoring.apm.instances.status.totalEventsLabel', {
        defaultMessage: 'Total Events'
      }),
      value: formatMetric(totalEvents, '0.[0]a'),
      'data-test-subj': 'totalEvents'
    },
    {
      label: i18n.translate('xpack.monitoring.apm.instances.status.lastEventLabel', {
        defaultMessage: 'Last Event'
      }),
      value: i18n.translate('xpack.monitoring.apm.instances.status.lastEventDescription', {
        defaultMessage: '{timeOfLastEvent} ago',
        values: {
          timeOfLastEvent: formatTimestampToDuration(+moment(timeOfLastEvent), CALCULATE_DURATION_SINCE)
        }
      }),
      'data-test-subj': 'timeOfLastEvent',
    }
  ];

  const IconComponent = ({ status }) => (
    <Fragment>
      <FormattedMessage
        id="xpack.monitoring.apm.instances.statusDescription"
        defaultMessage="Status: {apmStatusIcon}"
        values={{
          apmStatusIcon: (
            <ApmStatusIcon status={status} />
          )
        }}
      />
    </Fragment>
  );

  return (
    <SummaryStatus
      metrics={metrics}
      IconComponent={IconComponent}
      data-test-subj="apmDetailStatus"
    />
  );
}
