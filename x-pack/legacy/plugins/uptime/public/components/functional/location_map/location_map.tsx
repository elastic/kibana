/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiErrorBoundary } from '@elastic/eui';
import { LocationStatusTags } from './location_status_tags';
import { EmbeddedMap } from './embeddables/embedded_map';
import { Location, MonitorLocations, MonitorLocation } from '../../../../common/runtime_types';
import { UNNAMED_LOCATION } from '../../../../common/constants';
import { LocationMissingWarning } from './location_missing';

// These height/width values are used to make sure map is in center of panel
// And to make sure, it doesn't take too much space
const MapPanel = styled.div`
  height: 240px;
  width: 520px;
  margin-right: 20px;
`;

interface LocationMapProps {
  monitorLocations: MonitorLocations;
}

export const LocationMap = ({ monitorLocations }: LocationMapProps) => {
  const upPoints: Location[] = [];
  const downPoints: Location[] = [];

  let isGeoInfoMissing = false;

  if (monitorLocations?.locations) {
    monitorLocations.locations.forEach((item: MonitorLocation) => {
      if (item.geo?.name === UNNAMED_LOCATION || !item.geo?.location) {
        isGeoInfoMissing = true;
      } else if (item.geo?.name !== UNNAMED_LOCATION) {
        if (item?.summary?.down === 0) {
          upPoints.push(item.geo.location);
        } else {
          downPoints.push(item.geo.location);
        }
      }
    });
  }
  return (
    <EuiErrorBoundary>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <LocationStatusTags locations={monitorLocations?.locations || []} />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          {isGeoInfoMissing && <LocationMissingWarning />}
          <MapPanel>
            <EmbeddedMap upPoints={upPoints} downPoints={downPoints} />
          </MapPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiErrorBoundary>
  );
};
