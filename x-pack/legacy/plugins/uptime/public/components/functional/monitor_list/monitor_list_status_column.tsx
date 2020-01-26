/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { capitalize } from 'lodash';
import styled from 'styled-components';
import { EuiHealth, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { parseTimestamp } from './parse_timestamp';
import { Check } from '../../../../common/graphql/types';
import { DOWN, SHORT_TIMESPAN_LOCALE, UNNAMED_LOCATION, UP } from '../../../../common/constants';

interface MonitorListStatusColumnProps {
  status: string;
  timestamp: string;
  checks: Check[];
}

const PaddedSpan = styled.span`
  padding-left: 17px;
`;

const getHealthColor = (status: string): string => {
  switch (status) {
    case UP:
      return 'success';
    case DOWN:
      return 'danger';
    default:
      return '';
  }
};

const getHealthMessage = (status: string): string | null => {
  switch (status) {
    case UP:
      return i18n.translate('xpack.uptime.monitorList.statusColumn.upLabel', {
        defaultMessage: 'Up',
      });
    case DOWN:
      return i18n.translate('xpack.uptime.monitorList.statusColumn.downLabel', {
        defaultMessage: 'Down',
      });
    default:
      return null;
  }
};

const getRelativeShortTimeStamp = (timeStamp: any) => {
  const prevLocal: string = moment.locale() ?? 'en';

  const shortLocale = moment.locale('en-tag') === 'en-tag';

  if (!shortLocale) {
    moment.defineLocale('en-tag', SHORT_TIMESPAN_LOCALE);
  }

  const shortTimestamp = parseTimestamp(timeStamp).fromNow();
  moment.locale(prevLocal);
  return shortTimeStamp;
};

const getLocationStatus = (checks: Check[], status: string) => {
  const upChecks: Set<string> = new Set();
  const downChecks: Set<string> = new Set();

  checks.forEach((check: Check) => {
    const location = check?.observer?.geo?.name ?? UNNAMED_LOCATION;

    if (check.monitor.status === UP) {
      upChecks.add(capitalize(location));
    } else if (check.monitor.status === DOWN) {
      downChecks.add(capitalize(location));
    }
  });

  // if monitor is down in one dns, it will be considered down so removing it from up list
  const absUpChecks: Set<string> = new Set([...upChecks].filter(item => !downChecks.has(item)));

  const totalLocations = absUpChecks.size + downChecks.size;
  let statusMessage = '';
  if (status === DOWN) {
    statusMessage = `${downChecks.size}/${totalLocations}`;
  } else {
    statusMessage = `${absUpChecks.size}/${totalLocations}`;
  }

  return i18n.translate('xpack.uptime.monitorList.statusColumn.locStatusMessage', {
    defaultMessage: 'in {noLoc} Locations',
    values: { noLoc: statusMessage },
  });
};

export const MonitorListStatusColumn = ({
  status,
  checks = [],
  timestamp: tsString,
}: MonitorListStatusColumnProps) => {
  const timestamp = parseTimestamp(tsString);
  return (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={1}>
        <EuiHealth color={getHealthColor(status)} style={{ display: 'block' }}>
          {getHealthMessage(status)}
        </EuiHealth>
        <PaddedSpan>
          <EuiToolTip
            content={
              <EuiText color="ghost" size="xs">
                {timestamp.toLocaleString()}
              </EuiText>
            }
          >
            <EuiText size="xs" color="subdued">
              {getRelativeShortTimeStamp(tsString)}
            </EuiText>
          </EuiToolTip>
        </PaddedSpan>
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <EuiText size="s">{getLocationStatus(checks, status)}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
