import React from 'react';

import {
  KuiBadge,
} from '../../../../components';

export default () => (
  <div>
    <KuiBadge type="default">
      Default
    </KuiBadge>

    &nbsp;&nbsp;

    <KuiBadge type="primary">
      Primary
    </KuiBadge>

    &nbsp;&nbsp;

    <KuiBadge type="secondary">
      Secondary
    </KuiBadge>

    &nbsp;&nbsp;

    <KuiBadge type="accent">
      Accent
    </KuiBadge>

    &nbsp;&nbsp;

    <KuiBadge type="warning">
      Warning
    </KuiBadge>

    &nbsp;&nbsp;

    <KuiBadge type="danger">
      Danger
    </KuiBadge>
  </div>

);
