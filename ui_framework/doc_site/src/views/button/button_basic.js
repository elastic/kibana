import React from 'react';

import {
  KuiButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiButton
      type={KuiButton.TYPE.BASIC}
      onClick={() => window.alert('Button clicked')}
    >
      Basic button
    </KuiButton>

    <br />

    <KuiButton
      type={KuiButton.TYPE.BASIC}
      isDisabled
    >
      Basic button, disabled
    </KuiButton>
  </div>
);
