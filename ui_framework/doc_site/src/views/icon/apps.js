import React from 'react';

import {
  KuiIcon,
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
  <div>
    {
      iconTypes.map(iconType => (
        <span key={iconType}>
          <KuiIcon
            type={iconType}
            size="xLarge"
          />
          &nbsp;
        </span>
      ))
    }
  </div>
);
