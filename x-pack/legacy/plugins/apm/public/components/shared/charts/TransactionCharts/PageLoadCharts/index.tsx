/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGrid, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { RegionMapChart } from '../RegionMapChart';

export const PageLoadCharts: React.SFC = () => {
  return (
    <EuiFlexGrid columns={1} gutterSize="s">
      <EuiFlexItem>
        <EuiPanel>
          <EuiTitle size="xs">
            <span>
              {i18n.translate(
                'xpack.apm.metrics.pageLoadCharts.avgPageLoadByCountryLabel',
                {
                  defaultMessage:
                    'Avg. page load duration distribution by country'
                }
              )}
            </span>
          </EuiTitle>
          <RegionMapChart />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGrid>
  );
};
