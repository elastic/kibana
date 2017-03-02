import React from 'react';

import {
  KuiHollowButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiHollowButton>
      Hollow button
    </KuiHollowButton>

    <br />

    <KuiHollowButton isDisabled>
      Hollow button, disabled
    </KuiHollowButton>
  </div>
);
