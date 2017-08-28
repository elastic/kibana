import React from 'react';

import {
  KuiButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiButton buttonType="warning">
      Warning button
    </KuiButton>

    <br />
    <br />

    <KuiButton
      buttonType="warning"
      disabled
    >
      Warning button, disabled
    </KuiButton>
  </div>

);
