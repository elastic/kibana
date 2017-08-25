import React from 'react';

import {
  KuiIcon,
} from '../../../../components';

const iconTypes = [
  'apps',
  'search',
  'user',
  'cross',
  'check',
  'lock',
  'help',
  'arrowUp',
  'arrowDown',
  'arrowLeft',
  'arrowRight',
  'sortUp',
  'sortDown',
];

export default () => (
  <div>
    {
      iconTypes.map(iconType => (
        <span key={iconType}>
          <KuiIcon
            type={iconType}
            size="medium"
          />
          &nbsp;
        </span>
      ))
    }
  </div>
);
