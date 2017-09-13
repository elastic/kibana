import React from 'react';

import {
  KuiIcon,
  KuiFlexGrid,
  KuiFlexItemPanel,
  KuiText,
} from '../../../../components';

const iconTypes = [
  'dashboardApp',
  'devToolsApp',
  'discoverApp',
  'graphApp',
  'machineLearningApp',
  'timelionApp',
  'visualizeApp',
];

export default () => (
  <KuiFlexGrid columns={4}>
    {
      iconTypes.map(iconType => (
        <KuiFlexItemPanel className="guideDemo__icon" key={iconType}>
          <KuiIcon
            type={iconType}
            size="large"
          />
          <KuiText size="small">
            <p>{iconType}</p>
          </KuiText>
        </KuiFlexItemPanel>
      ))
    }
  </KuiFlexGrid>
);
