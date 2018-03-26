import React from 'react';

import {
  KuiButton,
  KuiButtonGroup,
  KuiButtonIcon,
} from '../../../../components';

export default () => (
  <div>
    <KuiButtonGroup isUnited>
      <KuiButton buttonType="basic">
        Option A
      </KuiButton>

      <KuiButton buttonType="basic">
        Option B
      </KuiButton>

      <KuiButton buttonType="basic">
        Option C
      </KuiButton>
    </KuiButtonGroup>

    <br />

    <KuiButtonGroup isUnited>
      <KuiButton
        buttonType="basic"
        aria-label="Previous"
        icon={<KuiButtonIcon type="previous" />}
      />

      <KuiButton
        buttonType="basic"
        aria-label="Next"
        icon={<KuiButtonIcon type="next" />}
      />
    </KuiButtonGroup>
  </div>
);
