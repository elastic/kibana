import React from 'react';

import {
  KuiButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiButton type={KuiButton.TYPE.DANGER}>
      Danger button
    </KuiButton>

    <br />

    <KuiButton
      type={KuiButton.TYPE.DANGER}
      isDisabled
    >
      Danger button, disabled
    </KuiButton>
  </div>

);
