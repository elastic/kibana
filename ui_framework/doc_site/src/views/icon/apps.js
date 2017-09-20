import React from 'react';

import {
  KuiFlexGrid,
  KuiFlexItem,
  KuiIcon,
  KuiPanel,
  KuiText,
} from '../../../../components';

const iconTypes = [
  'apmApp',
  'dashboardApp',
  'devToolsApp',
  'discoverApp',
  'graphApp',
  'loggingApp',
  'machineLearningApp',
  'monitoringApp',
  'timelionApp',
  'visualizeApp',
];

export default () => (
  <KuiFlexGrid columns={4}>
    {
      iconTypes.map(iconType => (
        <KuiFlexItem className="guideDemo__icon" key={iconType}>
          <KuiPanel>
            <KuiIcon
              type={iconType}
              size="large"
            />
            <KuiText size="small">
              <p>{iconType}</p>
            </KuiText>
          </KuiPanel>
        </KuiFlexItem>
      ))
    }
  </KuiFlexGrid>
);
