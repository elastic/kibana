/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { getTimeRangeStartFromTime, getTimeRangeEndFromTime } from '@kbn/logs-shared-plugin/common';

import { getAllLogsDataViewSpec } from '@kbn/discover-utils';

import moment from 'moment';

import { EuiButton } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { useAuthz, useDiscoverLocator } from '../../../../../hooks';

interface ViewLogsProps {
  logStreamQuery: string;
  startTime: number;
  endTime: number;
  logSources?: string;
}

export const getFormattedRange = (date: string) => new Date(date).getTime();

/*
  Button that opens Discover with an "All logs" ad-hoc data view backed by the
  tab's own log sources — the same index the embedded log stream queries — so
  Discover always shows the same documents as the tab.

  Uses the Discover locator directly (not LOGS_LOCATOR) so the data view spec
  is self-contained and resolves in any solution space, including Security.
*/
export const ViewLogsButton: React.FunctionComponent<ViewLogsProps> = ({
  logStreamQuery,
  startTime,
  endTime,
  logSources,
}) => {
  const discoverLocator = useDiscoverLocator();
  const authz = useAuthz();

  const logsUrl = useMemo(() => {
    if (!logSources) {
      return undefined;
    }

    const now = moment().toISOString();
    const oneDayAgo = moment().subtract(1, 'day').toISOString();
    const defaultStartTime = getFormattedRange(oneDayAgo);
    const defaultEndTime = getFormattedRange(now);

    return discoverLocator?.getRedirectUrl({
      dataViewSpec: getAllLogsDataViewSpec({ allLogsIndexPattern: logSources }),
      timeRange: {
        from: getTimeRangeStartFromTime(startTime ? startTime : defaultStartTime),
        to: getTimeRangeEndFromTime(endTime ? endTime : defaultEndTime),
      },
      query: { language: 'kuery', query: logStreamQuery },
    });
  }, [discoverLocator, endTime, logSources, logStreamQuery, startTime]);

  return authz.fleet.readAgents && logsUrl ? (
    <EuiButton href={logsUrl} iconType="discoverApp" data-test-subj="viewInLogsBtn">
      <FormattedMessage
        id="xpack.fleet.agentLogs.openInDiscoverUiLinkText"
        defaultMessage="Open in Discover"
      />
    </EuiButton>
  ) : null;
};
