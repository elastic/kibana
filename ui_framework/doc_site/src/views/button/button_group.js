import React from 'react';

import {
  KuiBasicButton,
  KuiButtonGroup,
  KuiPrimaryButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiButtonGroup>
      <KuiBasicButton>
        Cancel
      </KuiBasicButton>
      <KuiBasicButton>
        Duplicate
      </KuiBasicButton>
      <KuiPrimaryButton>
        Save
      </KuiPrimaryButton>
    </KuiButtonGroup>

    <br />

    <KuiButtonGroup>
      <KuiBasicButton>
        Button group with one button
      </KuiBasicButton>
    </KuiButtonGroup>
  </div>
);
