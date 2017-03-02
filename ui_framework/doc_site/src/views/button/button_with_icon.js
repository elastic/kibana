import React from 'react';

import {
  KuiBasicButton,
  KuiButtonIcon,
  KuiDangerButton,
  KuiPrimaryButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiPrimaryButton icon={<KuiButtonIcon type={KuiButtonIcon.TYPE.CREATE} />}>
      Create
    </KuiPrimaryButton>

    <br />

    <KuiDangerButton icon={<KuiButtonIcon type={KuiButtonIcon.TYPE.DELETE} />}>
      Delete
    </KuiDangerButton>

    <br />

    <KuiBasicButton icon={<KuiButtonIcon type={KuiButtonIcon.TYPE.PREVIOUS} />}>
      Previous
    </KuiBasicButton>

    <br />

    <KuiBasicButton iconRight={<KuiButtonIcon type={KuiButtonIcon.TYPE.NEXT} />}>
      Next
    </KuiBasicButton>

    <br />

    <KuiBasicButton icon={<KuiButtonIcon classes="fa-plane" />}/>
  </div>
);
