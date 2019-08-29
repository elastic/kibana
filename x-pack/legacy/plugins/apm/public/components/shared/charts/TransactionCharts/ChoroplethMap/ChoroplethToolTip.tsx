/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { asTime } from '../../../../../utils/formatters';

export const ChoroplethToolTip: React.SFC<{
  name?: string;
  value?: number;
  doc_count?: number;
}> = ({ name, value, doc_count }) => {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 'larger' }}>{name}</div>
      <div>
        {i18n.translate(
          'xpack.apm.metrics.pageLoadCharts.RegionMapChart.ToolTip.avgPageLoadDuration',
          {
            defaultMessage: 'Avg. page load duration:'
          }
        )}
      </div>
      <div style={{ fontWeight: 'bold', fontSize: 'larger' }}>
        {value ? asTime(value) : null}
      </div>
      <div>
        (
        {i18n.translate(
          'xpack.apm.metrics.pageLoadCharts.RegionMapChart.ToolTip.countPageLoads',
          {
            values: { doc_count },
            defaultMessage: '{doc_count} page loads'
          }
        )}
        )
      </div>
    </div>
  );
};
