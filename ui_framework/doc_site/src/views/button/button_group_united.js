import React from 'react';

import {
  KuiButton,
  KuiButtonGroup,
  KuiButtonIcon,
} from '../../../../components';

export default () => (
  <div>
    <KuiButtonGroup isUnited>
      <KuiButton type="basic">
        Option A
      </KuiButton>

      <KuiButton type="basic">
        Option B
      </KuiButton>

      <KuiButton type="basic">
        Option C
      </KuiButton>
    </KuiButtonGroup>

    <br />

    <KuiButtonGroup isUnited>
      <KuiButton
        type="basic"
        icon={<KuiButtonIcon type="previous" />}
      />

      <KuiButton
        type="basic"
        icon={<KuiButtonIcon type="next" />}
      />
    </KuiButtonGroup>
  </div>
);
