/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
mapboxgl.accessToken =
  'pk.eyJ1Ijoic2hhaHphZDMxIiwiYSI6ImNrMWtxODZxYzBwZDczZ3FuNmRrbGllbjYifQ.6oxF8wkVYCmJ7316snDQtg';
export const LocationMap = () => {
  let mapContainer: any;
  let map: any;

  const bounds = [
    [-85, -80], // Southwest coordinates
    [180, 85], // Northeast coordinates
  ];

  useEffect(() => {
    map = new mapboxgl.Map({
      container: mapContainer,
      style: 'mapbox://styles/mapbox/light-v10',
      maxBounds: bounds,
    });
    // Perform cleanup
    return () => {
      map.remove();
    };
  }, []);

  const style = {
    width: '700px',
    height: '500px',
  };

  return <div style={style} ref={el => (mapContainer = el)} />;
};
