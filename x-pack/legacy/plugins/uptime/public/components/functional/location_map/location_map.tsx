/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { EmbeddedMap, LocationPoint } from './embeddables/embedded_map';

const MapPanel = styled.div`
  height: 360px;
  width: 520px;
`;

interface LocationMapProps {
  monitorLocations: any;
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
    <MapPanel>
      <EmbeddedMap upPoints={upPoints} downPoints={downPoints} />
    </MapPanel>
  );
};
