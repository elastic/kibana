import React from 'react';

import {
  KuiButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiButton type="primary">
      Primary button
    </KuiButton>

    <br />

    <KuiButton
      type="primary"
      disabled
    >
      Primary button, disabled
    </KuiButton>
  </div>
);
