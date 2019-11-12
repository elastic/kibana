/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { get } from 'lodash';
import { EuiHealth, EuiSpacer, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Check } from '../../../../../common/graphql/types';
import { UptimeSettingsContext } from '../../../../contexts';
import { LocationLink } from './location_link';

interface MonitorStatusListProps {
  /**
   * Recent List of checks performed on monitor
   */
  checks: Check[];
}

export const MonitorStatusList = ({ checks }: MonitorStatusListProps) => {
  const {
    colors: { success, danger },
  } = useContext(UptimeSettingsContext);

  const upChecks: Set<string> = new Set();
  const downChecks: Set<string> = new Set();

  const UN_NAMED_LOCATION = 'unnamed-location';

  checks.forEach((check: Check) => {
    let location = get<string>(check, 'observer.geo.name', UN_NAMED_LOCATION);

    if (location === null) {
      location = UN_NAMED_LOCATION;
    }

    if (check.monitor.status === 'up') {
      upChecks.add(location);
    } else if (check.monitor.status === 'down') {
      downChecks.add(location);
    }
  });

  // if monitor is down in one dns, it will be considered down so removing it from up list

  const absUpChecks: Set<string> = new Set([...upChecks].filter(item => !downChecks.has(item)));

  const displayMonitorStatus = (checksList: Set<string>, color: string, titleTxt: string) => {
    let checkListArray = [...checksList];
    // If un-named location exists, move it to end
    if (checksList.has(UN_NAMED_LOCATION)) {
      checkListArray = checkListArray.filter(item => item !== UN_NAMED_LOCATION);
      checkListArray.push(UN_NAMED_LOCATION);
    }

    return (
      <>
        <EuiHealth color={color}>
          {titleTxt} in {checkListArray.map((location, index) => (index ? ', ' : '') + location)}
        </EuiHealth>
        <EuiSpacer size="s" />
      </>
    );
  };
  return (
    <>
      {downChecks.size > 0 && displayMonitorStatus(downChecks, danger, 'Down')}
      {absUpChecks.size > 0 && displayMonitorStatus(upChecks, success, 'Up')}
      {(downChecks.has(UN_NAMED_LOCATION) || upChecks.has(UN_NAMED_LOCATION)) && (
        <EuiCallOut color="warning">
          {i18n.translate('xpack.uptime.monitorList.drawer.missingLocation.description', {
            defaultMessage: `Some heartbeat instances do not have a location defined.`,
          })}
          <LocationLink />{' '}
          {i18n.translate('xpack.uptime.monitorList.drawer.missingLocation.toLocationDocsLink', {
            defaultMessage: `to your heartbeat configuration.`,
          })}
        </EuiCallOut>
      )}
    </>
  );
};
