import React from 'react';

import {
  KuiBasicButton,
  KuiButtonGroup,
  KuiButtonIcon,
} from '../../../../components';

export default () => (
  <div>
    <KuiButtonGroup isUnited>
      <KuiBasicButton>
        Option A
      </KuiBasicButton>
      <KuiBasicButton>
        Option B
      </KuiBasicButton>
      <KuiBasicButton>
        Option C
      </KuiBasicButton>
    </KuiButtonGroup>

    <br />

    <KuiButtonGroup isUnited>
      <KuiBasicButton icon={<KuiButtonIcon type={KuiButtonIcon.TYPE.PREVIOUS} />}/>
      <KuiBasicButton iconRight={<KuiButtonIcon type={KuiButtonIcon.TYPE.NEXT} />}/>
    </KuiButtonGroup>
  </div>
);
