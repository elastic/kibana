/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import styled from 'styled-components';
import { connect } from 'react-redux';
import { EmbeddedMap, LocationPoint } from './embeddables/embedded_map';
import { fetchMonitorLocations } from '../../../state/actions/monitor';
import { AppState } from '../../../state';
import { getMonitorLocations } from '../../../state/selectors';

const MapPanel = styled.div`
  height: 400px;
  width: 520px;
`;

interface LocationMapProps {
  monitorId: string;
  loadMonitorLocations: any;
  monitorLocations: any;
}

export const LocationMapComponent = ({
  monitorId,
  loadMonitorLocations,
  monitorLocations,
}: LocationMapProps) => {
  useEffect(() => {
    loadMonitorLocations(monitorId);
  }, []);

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

const mapStateToProps = (state: AppState, { monitorId }: any) => ({
  monitorLocations: getMonitorLocations(state, monitorId),
});

const mapDispatchToProps = (dispatch: any) => ({
  loadMonitorLocations: (monitorId: string) => dispatch(fetchMonitorLocations(monitorId)),
});

export const LocationMap = connect(mapStateToProps, mapDispatchToProps)(LocationMapComponent);
