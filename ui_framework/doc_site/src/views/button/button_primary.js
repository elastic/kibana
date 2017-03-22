import React from 'react';

import {
  KuiButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiButton type={KuiButton.TYPE.PRIMARY}>
      Primary button
    </KuiButton>

    <br />

    <KuiButton
      type={KuiButton.TYPE.PRIMARY}
      isDisabled
    >
      Primary button, disabled
    </KuiButton>
  </div>
);
