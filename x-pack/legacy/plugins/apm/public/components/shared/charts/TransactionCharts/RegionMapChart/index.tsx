/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { ChoroplethMap } from './ChoroplethMap';
import { ColorProgressionBar } from './ColorProgressionBar';
import { useAvgDurationByCountry } from '../../../../../hooks/useAvgDurationByCountry';

function getProgressionColor(
  scale: number,
  // default to euiColorPrimary (#006BB4)
  color = { hue: 204, saturation: 100, lightness: { min: 20, max: 90 } }
) {
  const { min, max } = color.lightness;
  const lightness = Math.round(min + (max - min) * (1 - scale));
  return `hsl(${color.hue},${color.saturation}%,${lightness}%)`;
}

const RegionMapChartToolTip: React.SFC<{
  geojsonProperties: { [name: string]: any };
  data?: { key: string; value: number } & Partial<{ docCount: number }>;
}> = ({ geojsonProperties, data }) => {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 'larger' }}>{geojsonProperties.name}</div>
      <div>Avg. page load duration:</div>
      <div style={{ fontWeight: 'bold', fontSize: 'larger' }}>
        {data && data.value}ms
      </div>
      <div>({data && data.docCount} page loads)</div>
    </div>
  );
};

export const RegionMapChart: React.SFC = () => {
  const { data } = useAvgDurationByCountry();
  const choroplethData = useMemo(
    () =>
      data.map(
        ({
          country_iso2_code: key,
          avg_duration_us: value,
          count: docCount
        }) => ({ key, value: value / 1000, docCount })
      ),
    [data]
  );
  const maxValue = useMemo(
    () => Math.max(...choroplethData.map(({ value }) => value)),
    [choroplethData]
  );
  return (
    <div>
      <ChoroplethMap
        getColorStyle={getProgressionColor}
        mapboxStyle="https://tiles.maps.elastic.co/styles/osm-bright-desaturated/style.json"
        initialMapboxOptions={{
          zoom: 0.75,
          center: {
            lng: -25,
            lat: 25
          }
        }}
        geojsonSource="https://vector.maps.elastic.co/files/world_countries_v1.geo.json?elastic_tile_service_tos=agree&my_app_name=ems-landing&my_app_version=7.2.0"
        geojsonKeyProperty="iso2"
        maxValue={maxValue}
        data={choroplethData}
        renderTooltip={RegionMapChartToolTip}
      />
      <ColorProgressionBar slices={10} getColorStyle={getProgressionColor} />
    </div>
  );
};
