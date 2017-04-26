import React from 'react';

import {
  KuiButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiButton type="danger">
      Danger button
    </KuiButton>

    <br />

    <KuiButton
      type="danger"
      disabled
    >
      Danger button, disabled
    </KuiButton>
  </div>

);
