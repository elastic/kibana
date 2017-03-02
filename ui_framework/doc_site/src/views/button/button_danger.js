import React from 'react';

import {
  KuiDangerButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiDangerButton>
      Danger button
    </KuiDangerButton>

    <br />

    <KuiDangerButton isDisabled>
      Danger button, disabled
    </KuiDangerButton>
  </div>

);
