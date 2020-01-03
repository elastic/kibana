/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { LocationStatusTags } from './location_status_tags';
import { EmbeddedMap, LocationPoint } from './embeddables/embedded_map';
import { MonitorLocations } from '../../../../common/runtime_types';

const MapPanel = styled.div`
  height: 240px;
  width: 520px;
  margin-right: 10px;
`;

interface LocationMapProps {
  monitorLocations: MonitorLocations;
}

export const LocationMap = ({ monitorLocations }: LocationMapProps) => {
  const upPoints: LocationPoint[] = [];
  const downPoints: LocationPoint[] = [];

  if (monitorLocations?.locations) {
    monitorLocations.locations.forEach((item: any) => {
      if (item.summary.down === 0) {
        upPoints.push(item.geo.location);
      } else {
        downPoints.push(item.geo.location);
      }
    });
  }
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <LocationStatusTags locations={monitorLocations?.locations || []} />
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <MapPanel>
          <EmbeddedMap upPoints={upPoints} downPoints={downPoints} />
        </MapPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
