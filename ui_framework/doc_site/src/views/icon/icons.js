import React from 'react';

import {
  KuiIcon,
  KuiFlexGrid,
  KuiFlexItemPanel,
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
  <KuiFlexGrid columns={4}>
    {
      iconTypes.map(iconType => (
        <KuiFlexItemPanel className="guideDemo__icon" key={iconType}>
          <KuiIcon
            type={iconType}
          />
          <KuiText size="small">
            <p>{iconType}</p>
          </KuiText>
        </KuiFlexItemPanel>
      ))
    }
  </KuiFlexGrid>
);
