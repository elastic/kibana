/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { get, capitalize } from 'lodash';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Check } from '../../../../../common/graphql/types';
import { LocationLink } from './location_link';
import { MonitorStatusRow } from './monitor_status_row';

interface MonitorStatusListProps {
  /**
   * Recent List of checks performed on monitor
   */
  checks: Check[];
}

export const UP = 'up';
export const DOWN = 'down';
export const UNNAMED_LOCATION = 'unnamed-location';

export const MonitorStatusList = ({ checks }: MonitorStatusListProps) => {
  const upChecks: Set<string> = new Set();
  const downChecks: Set<string> = new Set();

  checks.forEach((check: Check) => {
    // Doing this way because name is either string or null, get() default value only works on undefined value
    const location = get<string | null>(check, 'observer.geo.name', null) || UNNAMED_LOCATION;

    if (check.monitor.status === UP) {
      upChecks.add(capitalize(location));
    } else if (check.monitor.status === DOWN) {
      downChecks.add(capitalize(location));
    }
  });

  // if monitor is down in one dns, it will be considered down so removing it from up list
  const absUpChecks: Set<string> = new Set([...upChecks].filter(item => !downChecks.has(item)));

  return (
    <>
      <MonitorStatusRow locationNames={downChecks} status={DOWN} />
      <MonitorStatusRow locationNames={absUpChecks} status={UP} />
      {(downChecks.has(UNNAMED_LOCATION) || upChecks.has(UNNAMED_LOCATION)) && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut color="warning">
            <FormattedMessage
              id="xpack.uptime.monitorList.drawer.missingLocation"
              defaultMessage="Some heartbeat instances do not have a location defined. {link} to your heartbeat configuration."
              values={{ link: <LocationLink /> }}
            />
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}
    </>
  );
};
