import React from 'react';

import {
  KuiBasicButton,
  KuiButtonIcon,
  KuiCreateButtonIcon,
  KuiDangerButton,
  KuiDeleteButtonIcon,
  KuiNextButtonIcon,
  KuiPreviousButtonIcon,
  KuiPrimaryButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiPrimaryButton icon={<KuiCreateButtonIcon />}>
      Create
    </KuiPrimaryButton>

    <br />

    <KuiDangerButton icon={<KuiDeleteButtonIcon />}>
      Delete
    </KuiDangerButton>

    <br />

    <KuiBasicButton icon={<KuiPreviousButtonIcon />}>
      Previous
    </KuiBasicButton>

    <br />

    <KuiBasicButton iconRight={<KuiNextButtonIcon />}>
      Next
    </KuiBasicButton>

    <br />

    <KuiBasicButton icon={<KuiButtonIcon className="fa-plane" />}/>
  </div>
);
