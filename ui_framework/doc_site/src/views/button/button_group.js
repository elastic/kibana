import React from 'react';

import {
  KuiButton,
  KuiButtonGroup,
} from '../../../../components';

export default () => (
  <div>
    <KuiButtonGroup>
      <KuiButton buttonType="basic">
        Cancel
      </KuiButton>

      <KuiButton buttonType="basic">
        Duplicate
      </KuiButton>

      <KuiButton buttonType="primary">
        Save
      </KuiButton>
    </KuiButtonGroup>

    <br />

    <KuiButtonGroup>
      <KuiButton buttonType="basic">
        Button group with one button
      </KuiButton>
    </KuiButtonGroup>
  </div>
);
