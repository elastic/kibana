import React from 'react';

import {
  KuiBasicButton,
  KuiDangerButton,
  KuiPrimaryButton,
} from '../../../../components';

export default () => (
  <div className="kuiToolBar">
    <KuiBasicButton>
      Basic button
    </KuiBasicButton>

    <KuiBasicButton isDisabled>
      Basic button, disabled
    </KuiBasicButton>

    <KuiPrimaryButton>
      Primary button
    </KuiPrimaryButton>

    <KuiPrimaryButton isDisabled>
      Primary button, disabled
    </KuiPrimaryButton>

    <KuiDangerButton>
      Danger button
    </KuiDangerButton>

    <KuiDangerButton isDisabled>
      Danger button, disabled
    </KuiDangerButton>
  </div>
);
