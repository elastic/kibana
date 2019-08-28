/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  ChoroplethMap,
  getProgressionColor,
  getDataRange
} from './ChoroplethMap';
import { ColorProgressionBar } from './ColorProgressionBar';
import { useAvgDurationByCountry } from '../../../../../hooks/useAvgDurationByCountry';

const RegionMapChartToolTip: React.SFC<{
  geojsonProperties: { [name: string]: any };
  data?: { key: string; value: number; doc_count?: number };
}> = ({ geojsonProperties, data }) => {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 'larger' }}>{geojsonProperties.name}</div>
      <div>
        {i18n.translate(
          'xpack.apm.metrics.pageLoadCharts.avgPageLoadByCountryLabel',
          {
            defaultMessage: 'Avg. page load duration:'
          }
        )}
      </div>
      <div style={{ fontWeight: 'bold', fontSize: 'larger' }}>
        {data && data.value}ms
      </div>
      <div>
        (
        {i18n.translate('xpack.apm.servicesTable.environmentCount', {
          values: { docCount: data && data.doc_count },
          defaultMessage: '{docCount} page loads'
        })}
        )
      </div>
      >
    </div>
  );
};

export const RegionMapChart: React.SFC = () => {
  const { data } = useAvgDurationByCountry();
  const [min, max] = getDataRange(data);

  return (
    <div>
      <ChoroplethMap
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
        getColorStyle={getProgressionColor}
        min={`${min}ms`}
        max={`${max}ms`}
      />
    </div>
  );
};
