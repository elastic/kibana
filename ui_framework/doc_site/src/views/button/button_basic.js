import React from 'react';

import {
  KuiBasicButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiBasicButton>
      Basic button
    </KuiBasicButton>

    <br />

    <KuiBasicButton isDisabled>
      Basic button, disabled
    </KuiBasicButton>
  </div>
);
