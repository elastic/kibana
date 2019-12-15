/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { EuiHealth, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { UptimeSettingsContext } from '../../../../contexts';
import { UNNAMED_LOCATION, UP } from './monitor_status_list';

interface MonitorStatusRowProps {
  /**
   * Recent List of checks performed on monitor
   */
  locationNames: Set<string>;
  /**
   * Monitor status for this of locations
   */
  status: string;
}

export const MonitorStatusRow = ({ locationNames, status }: MonitorStatusRowProps) => {
  const {
    colors: { success, danger },
  } = useContext(UptimeSettingsContext);

  const color = status === UP ? success : danger;

  let checkListArray = [...locationNames];
  // If un-named location exists, move it to end
  if (locationNames.has(UNNAMED_LOCATION)) {
    checkListArray = checkListArray.filter(item => item !== UNNAMED_LOCATION);
    checkListArray.push(UNNAMED_LOCATION);
  }

  if (locationNames.size === 0) {
    return null;
  }

  const locations = checkListArray.join(', ');
  return (
    <>
      <EuiHealth color={color}>
        {status === UP ? (
          <FormattedMessage
            id="xpack.uptime.monitorList.drawer.locations.statusUp"
            defaultMessage="Up in {locations}"
            values={{ locations }}
          />
        ) : (
          <FormattedMessage
            id="xpack.uptime.monitorList.drawer.locations.statusDown"
            defaultMessage="Down in {locations}"
            values={{ locations }}
          />
        )}
      </EuiHealth>
      <EuiSpacer size="s" />
    </>
  );
};
