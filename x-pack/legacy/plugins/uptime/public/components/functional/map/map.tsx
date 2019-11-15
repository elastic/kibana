/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { EmbeddedMap } from '../embeddables/embedded_map';

const MapPanel = styled.div`
  height: 400px;
  width: 520px;
`;

export const LocationMap = () => {
  // return <div style={style} ref={el => (mapContainer = el)} />;
  return (
    <MapPanel>
      <EmbeddedMap filters={[]} query={{ query: '', language: 'kuery' }} />
    </MapPanel>
  );
};
