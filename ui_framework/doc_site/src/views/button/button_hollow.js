import React from 'react';

import {
  KuiButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiButton type={KuiButton.TYPE.HOLLOW}>
      Hollow button
    </KuiButton>

    <br />

    <KuiButton
      type={KuiButton.TYPE.HOLLOW}
      isDisabled
    >
      Hollow button, disabled
    </KuiButton>
  </div>
);
