/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { MonitorLocation } from '../../../../../common/runtime_types';

interface StatusByLocationsProps {
  locations: MonitorLocation[];
}

export const StatusByLocations = ({ locations }: StatusByLocationsProps) => {
  const upLocations: string[] = [];
  const downLocations: string[] = [];

  if (locations)
    locations.forEach((item: any) => {
      if (item.summary.down === 0) {
        upLocations.push(item.geo.name);
      } else {
        downLocations.push(item.geo.name);
      }
    });

  return (
    <EuiText>
      <h2>
        <FormattedMessage
          id="xpack.uptime.monitorStatusBar.locations.upStatus"
          values={{
            status: downLocations.length > 0 ? 'Down' : 'Up',
            loc:
              downLocations.length > 0
                ? `${downLocations.length}/${locations.length}`
                : `${upLocations.length}/${locations.length}`,
          }}
          defaultMessage="{status} in {loc} Locations"
        />
      </h2>
    </EuiText>
  );
};
