import React from 'react';

import {
  KuiBadge,
} from '../../../../components';

export default () => (
  <div>

    <KuiBadge iconType="cross">
      Primary
    </KuiBadge>

    &nbsp;&nbsp;

    <KuiBadge type="primary" iconType="user" iconSide="left">
      Secondary
    </KuiBadge>

  </div>

);
