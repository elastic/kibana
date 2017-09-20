import React from 'react';

import {
  KuiIcon,
  KuiFlexGrid,
  KuiFlexItemPanel,
  KuiText,
} from '../../../../components';

const iconSizes = [
  'medium',
  'large',
  'xLarge',
  'xxLarge',
  'original',
];

export default () => (
  <KuiFlexGrid columns={4}>
    {
      iconSizes.map(iconSize => (
        <KuiFlexItemPanel className="guideDemo__icon" key={iconSize}>
          <KuiIcon
            type="logoElasticStack"
            size={iconSize}
          />
          <KuiText size="small">
            <p>{iconSize}</p>
          </KuiText>
        </KuiFlexItemPanel>
      ))
    }
  </KuiFlexGrid>
);
