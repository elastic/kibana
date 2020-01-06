/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

interface StatusByLocationsProps {
  locations: any;
}

export const StatusByLocations = ({ locations }: StatusByLocationsProps) => {
  const upLocs: string[] = [];
  const downLocs: string[] = [];

  if (locations)
    locations.forEach((item: any) => {
      if (item.summary.down === 0) {
        upLocs.push(item.geo.name);
      } else {
        downLocs.push(item.geo.name);
      }
    });

  return (
    <EuiText>
      <h2>
        <FormattedMessage
          id="xpack.uptime.monitorStatusBar.locations.upStatus"
          values={{
            status: downLocs.length > 0 ? 'Down' : 'Up',
            loc:
              downLocs.length > 0
                ? `${downLocs.length}/${locations.length}`
                : `${upLocs.length}/${locations.length}`,
          }}
          defaultMessage="{status} in {loc} Locations"
        />
      </h2>
    </EuiText>
  );
};
