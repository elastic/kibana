import React from 'react';

import {
  KuiButton,
  KuiButtonGroup,
  KuiButtonIcon,
} from '../../../../components';

export default () => (
  <div>
    <KuiButtonGroup isUnited>
      <KuiButton type={KuiButton.TYPE.BASIC}>
        Option A
      </KuiButton>

      <KuiButton type={KuiButton.TYPE.BASIC}>
        Option B
      </KuiButton>

      <KuiButton type={KuiButton.TYPE.BASIC}>
        Option C
      </KuiButton>
    </KuiButtonGroup>

    <br />

    <KuiButtonGroup isUnited>
      <KuiButton
        type={KuiButton.TYPE.BASIC}
        icon={<KuiButtonIcon type={KuiButtonIcon.TYPE.PREVIOUS} />}
      />

      <KuiButton
        type={KuiButton.TYPE.BASIC}
        icon={<KuiButtonIcon type={KuiButtonIcon.TYPE.NEXT} />}
      />
    </KuiButtonGroup>
  </div>
);
