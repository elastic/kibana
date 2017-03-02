import React from 'react';

import {
  KuiPrimaryButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiPrimaryButton>
      Primary button
    </KuiPrimaryButton>

    <br />

    <KuiPrimaryButton isDisabled>
      Primary button, disabled
    </KuiPrimaryButton>
  </div>
);
