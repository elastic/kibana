import React from 'react';

import {
  KuiButton,
} from '../../../../components';

export default () => (
  <div className="kuiToolBar">
    <KuiButton buttonType="basic">
      Basic button
    </KuiButton>

    <KuiButton
      buttonType="basic"
      disabled
    >
      Basic button, disabled
    </KuiButton>

    <KuiButton buttonType="primary">
      Primary button
    </KuiButton>

    <KuiButton
      buttonType="primary"
      disabled
    >
      Primary button, disabled
    </KuiButton>

    <KuiButton buttonType="danger">
      Danger button
    </KuiButton>

    <KuiButton
      buttonType="danger"
      disabled
    >
      Danger button, disabled
    </KuiButton>

    <KuiButton type="warning">
      Warning button
    </KuiButton>

    <KuiButton
      type="warning"
      disabled
    >
      Warning button, disabled
    </KuiButton>
  </div>
);
