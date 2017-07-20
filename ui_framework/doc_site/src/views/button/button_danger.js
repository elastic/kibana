import React from 'react';

import {
  KuiButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiButton buttonType="danger">
      Danger button
    </KuiButton>

    <br />

    <KuiButton
      buttonType="danger"
      disabled
    >
      Danger button, disabled
    </KuiButton>
  </div>

);
