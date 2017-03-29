import React from 'react';

import {
  KuiButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiButton type="hollow">
      Hollow button
    </KuiButton>

    <br />

    <KuiButton
      type="hollow"
      disabled
    >
      Hollow button, disabled
    </KuiButton>
  </div>
);
