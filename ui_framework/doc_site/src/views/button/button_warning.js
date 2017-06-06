import React from 'react';

import {
  KuiButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiButton type="warning">
      Warning button
    </KuiButton>

    <br />

    <KuiButton
      type="warning"
      disabled
    >
      Warning button, disabled
    </KuiButton>
  </div>

);
