import React from 'react';

import {
  KuiButton,
  KuiButtonGroup,
} from '../../../../components';

export default () => (
  <div>
    <KuiButtonGroup>
      <KuiButton type={KuiButton.TYPE.BASIC}>
        Cancel
      </KuiButton>

      <KuiButton type={KuiButton.TYPE.BASIC}>
        Duplicate
      </KuiButton>

      <KuiButton type={KuiButton.TYPE.PRIMARY}>
        Save
      </KuiButton>
    </KuiButtonGroup>

    <br />

    <KuiButtonGroup>
      <KuiButton type={KuiButton.TYPE.BASIC}>
        Button group with one button
      </KuiButton>
    </KuiButtonGroup>
  </div>
);
