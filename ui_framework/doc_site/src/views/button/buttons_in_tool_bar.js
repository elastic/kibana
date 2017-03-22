import React from 'react';

import {
  KuiButton,
} from '../../../../components';

export default () => (
  <div className="kuiToolBar">
    <KuiButton type={KuiButton.TYPE.BASIC}>
      Basic button
    </KuiButton>

    <KuiButton
      type={KuiButton.TYPE.BASIC}
      isDisabled
    >
      Basic button, disabled
    </KuiButton>

    <KuiButton type={KuiButton.TYPE.PRIMARY}>
      Primary button
    </KuiButton>

    <KuiButton
      type={KuiButton.TYPE.PRIMARY}
      isDisabled
    >
      Primary button, disabled
    </KuiButton>

    <KuiButton type={KuiButton.TYPE.DANGER}>
      Danger button
    </KuiButton>

    <KuiButton
      type={KuiButton.TYPE.DANGER}
      isDisabled
    >
      Danger button, disabled
    </KuiButton>
  </div>
);
