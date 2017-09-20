import React from 'react';

import {
  KuiFlexGrid,
  KuiFlexItem,
  KuiIcon,
  KuiPanel,
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
  <KuiFlexGrid>
    {
      iconSizes.map(iconSize => (
        <KuiFlexItem
          className="guideDemo__icon"
          key={iconSize}
          style={{ width: '340px' }}
        >
          <KuiPanel>
            <KuiIcon
              type="logoElasticStack"
              size={iconSize}
            />
            <KuiText size="small">
              <p>{iconSize}</p>
            </KuiText>
          </KuiPanel>
        </KuiFlexItem>
      ))
    }
  </KuiFlexGrid>
);
