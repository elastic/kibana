/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { ChoroplethMap } from './ChoroplethMap';
import { ColorProgressionBar } from './ColorProgressionBar';

function getProgressionColor(
  scale: number,
  color = { hue: 204, saturation: 100, lightness: { min: 20, max: 90 } } // default to euiColorPrimary (#006BB4)
) {
  const { min, max } = color.lightness;
  const lightness = Math.round(min + (max - min) * (1 - scale));
  return `hsl(${color.hue},${color.saturation}%,${lightness}%)`;
}

function getProgressionColor2(scale: number) {
  return getProgressionColor(scale, {
    hue: 350,
    saturation: 100,
    lightness: { min: 20, max: 90 }
  });
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

const testData = [
  { key: 'USA', value: 1203, docCount: 837 },
  { key: 'DNK', value: 237, docCount: 1783 },
  { key: 'CAN', value: 976, docCount: 91 },
  { key: 'ESP', value: 335, docCount: 58 },
  { key: 'AUS', value: 693, docCount: 22 },
  { key: 'AUT', value: 258, docCount: 68 },
  { key: 'NLD', value: 189, docCount: 833 }
];

const testData2 = [
  { key: 'USA', value: 189, docCount: 833 },
  { key: 'DNK', value: 258, docCount: 68 },
  { key: 'FRA', value: 693, docCount: 22 },
  { key: 'ESP', value: 335, docCount: 58 },
  { key: 'AUS', value: 976, docCount: 91 },
  { key: 'AUT', value: 237, docCount: 1783 },
  { key: 'NLD', value: 1203, docCount: 837 }
];

export const RegionMapChart: React.SFC = () => {
  const [toggleData, setToggleData] = useState(true);
  const [toggleStyle, setToggleStyle] = useState(true);
  const [toggleColor, setToggleColor] = useState(true);
  return (
    <div>
      <button onClick={() => setToggleData(!toggleData)}>
        toggleData: {JSON.stringify(toggleData)}
      </button>
      <button onClick={() => setToggleStyle(!toggleStyle)}>
        toggleStyle: {JSON.stringify(toggleStyle)}
      </button>
      <button onClick={() => setToggleColor(!toggleColor)}>
        toggleColor: {JSON.stringify(toggleColor)}
      </button>
      <ChoroplethMap
        getColorStyle={toggleColor ? getProgressionColor : getProgressionColor2}
        // mapboxStyle="https://tiles.maps.elastic.co/styles/osm-bright-desaturated/style.json"
        // mapboxStyle="https://tiles.maps.elastic.co/styles/dark-matter/style.json"
        mapboxStyle={
          toggleStyle
            ? 'https://tiles.maps.elastic.co/styles/osm-bright-desaturated/style.json'
            : 'https://tiles.maps.elastic.co/styles/dark-matter/style.json'
        }
        initialMapboxOptions={{
          zoom: 1,
          center: {
            lng: -45,
            lat: 45
          }
        }}
        geojsonSource="https://vector.maps.elastic.co/files/world_countries_v1.geo.json?elastic_tile_service_tos=agree&my_app_name=ems-landing&my_app_version=7.2.0"
        geojsonKeyProperty="iso3"
        maxValue={1203}
        data={toggleData ? testData : testData2}
        renderTooltip={RegionMapChartToolTip}
      />
      <ColorProgressionBar
        slices={10}
        getColorStyle={toggleColor ? getProgressionColor : getProgressionColor2}
      />
    </div>
  );
};
