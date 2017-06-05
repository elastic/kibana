import React from 'react';

import {
  KuiButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiButton buttonType="primary">
      Primary button
    </KuiButton>

    <br />

    <KuiButton
      buttonType="primary"
      disabled
    >
      Primary button, disabled
    </KuiButton>
  </div>
);
