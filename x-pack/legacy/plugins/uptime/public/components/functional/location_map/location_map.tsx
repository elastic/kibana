/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import styled from 'styled-components';
import { connect } from 'react-redux';
import { EmbeddedMap } from '../embeddables/embedded_map';
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
}

export const LocationMapComponent = ({ monitorId, loadMonitorLocations }: LocationMapProps) => {
  // return <div style={style} ref={el => (mapContainer = el)} />;
  useEffect(() => {
    loadMonitorLocations(monitorId);
  }, []);
  return (
    <MapPanel>
      <EmbeddedMap filters={[]} query={{ query: '', language: 'kuery' }} />
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
