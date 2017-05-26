import React from 'react';

import {
  KuiButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiButton buttonType="hollow">
      Hollow button
    </KuiButton>

    <br />

    <KuiButton
      buttonType="hollow"
      disabled
    >
      Hollow button, disabled
    </KuiButton>
  </div>
);
