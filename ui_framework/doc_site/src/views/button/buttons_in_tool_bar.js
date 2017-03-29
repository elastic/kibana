import React from 'react';

import {
  KuiButton,
} from '../../../../components';

export default () => (
  <div className="kuiToolBar">
    <KuiButton type="basic">
      Basic button
    </KuiButton>

    <KuiButton
      type="basic"
      disabled
    >
      Basic button, disabled
    </KuiButton>

    <KuiButton type="primary">
      Primary button
    </KuiButton>

    <KuiButton
      type="primary"
      disabled
    >
      Primary button, disabled
    </KuiButton>

    <KuiButton type="danger">
      Danger button
    </KuiButton>

    <KuiButton
      type="danger"
      disabled
    >
      Danger button, disabled
    </KuiButton>
  </div>
);
