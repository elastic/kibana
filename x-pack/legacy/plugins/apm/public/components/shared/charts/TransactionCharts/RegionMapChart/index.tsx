/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ChoroplethMap, getDefaultProgressionColor } from './ChoroplethMap';
import { ColorProgressionBar } from './ColorProgressionBar';
import { useAvgDurationByCountry } from '../../../../../hooks/useAvgDurationByCountry';

const RegionMapChartToolTip: React.SFC<{
  geojsonProperties: { [name: string]: any };
  data?: { key: string; value: number; doc_count?: number };
}> = ({ geojsonProperties, data }) => {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 'larger' }}>{geojsonProperties.name}</div>
      <div>Avg. page load duration:</div>
      <div style={{ fontWeight: 'bold', fontSize: 'larger' }}>
        {data && data.value}ms
      </div>
      <div>({data && data.doc_count} page loads)</div>
    </div>
  );
};

export const RegionMapChart: React.SFC = () => {
  const { data } = useAvgDurationByCountry();

  return (
    <div>
      <ChoroplethMap
        mapboxStyle="https://tiles.maps.elastic.co/styles/osm-bright-desaturated/style.json"
        initialMapboxOptions={{
          zoom: 0.85,
          center: { lng: 0, lat: 30 }
        }}
        geojsonSource="https://vector.maps.elastic.co/files/world_countries_v1.geo.json?elastic_tile_service_tos=agree&my_app_name=ems-landing&my_app_version=7.2.0"
        geojsonKeyProperty="iso2"
        data={data}
        renderTooltip={RegionMapChartToolTip}
      />
      <ColorProgressionBar
        slices={10}
        getColorStyle={getDefaultProgressionColor}
      />
    </div>
  );
};
