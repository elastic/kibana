import React from 'react';

import {
  KuiButton,
  KuiButtonGroup,
} from '../../../../components';

export default () => (
  <div>
    <KuiButtonGroup>
      <KuiButton type="basic">
        Cancel
      </KuiButton>

      <KuiButton type="basic">
        Duplicate
      </KuiButton>

      <KuiButton type="primary">
        Save
      </KuiButton>
    </KuiButtonGroup>

    <br />

    <KuiButtonGroup>
      <KuiButton type="basic">
        Button group with one button
      </KuiButton>
    </KuiButtonGroup>
  </div>
);
