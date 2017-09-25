import React from 'react';

import {
  KuiFlexGrid,
  KuiFlexItem,
  KuiIcon,
  KuiPanel,
  KuiText,
} from '../../../../components';

const iconTypes = [
  'apps',
  'arrowDown',
  'arrowLeft',
  'arrowRight',
  'arrowUp',
  'bolt',
  'boxesHorizontal',
  'boxesVertical',
  'brush',
  'bullseye',
  'check',
  'clock',
  'console',
  'controlsHorizontal',
  'controlsVertical',
  'cross',
  'document',
  'dot',
  'fullScreen',
  'gear',
  'grid',
  'help',
  'link',
  'list',
  'listAdd',
  'lock',
  'mapMarker',
  'pencil',
  'plusInCircle',
  'search',
  'share',
  'sortDown',
  'sortUp',
  'starEmpty',
  'tear',
  'trash',
  'user',
];

export default () => (
  <KuiFlexGrid columns="4">
    {
      iconTypes.map(iconType => (
        <KuiFlexItem
          className="guideDemo__icon"
          key={iconType}
          style={{ width: '200px' }}
        >
          <KuiPanel>
            <KuiIcon
              type={iconType}
            />
            <KuiText size="s">
              <p>{iconType}</p>
            </KuiText>
          </KuiPanel>
        </KuiFlexItem>
      ))
    }
  </KuiFlexGrid>
);
