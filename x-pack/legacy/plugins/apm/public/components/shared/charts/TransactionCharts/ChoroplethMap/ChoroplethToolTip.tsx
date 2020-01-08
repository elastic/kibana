/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { asDuration, asInteger } from '../../../../../utils/formatters';
import { fontSizes } from '../../../../../style/variables';

export const ChoroplethToolTip: React.FC<{
  name: string;
  value: number;
  docCount: number;
}> = ({ name, value, docCount }) => {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: fontSizes.large }}>{name}</div>
      <div>
        {i18n.translate(
          'xpack.apm.metrics.durationByCountryMap.RegionMapChart.ToolTip.avgPageLoadDuration',
          {
            defaultMessage: 'Avg. page load duration:'
          }
        )}
      </div>
      <div style={{ fontWeight: 'bold', fontSize: fontSizes.large }}>
        {asDuration(value)}
      </div>
      <div>
        (
        {i18n.translate(
          'xpack.apm.metrics.durationByCountryMap.RegionMapChart.ToolTip.countPageLoads',
          {
            values: { docCount: asInteger(docCount) },
            defaultMessage: '{docCount} page loads'
          }
        )}
        )
      </div>
    </div>
  );
};
