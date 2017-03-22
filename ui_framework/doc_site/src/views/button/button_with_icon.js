import React from 'react';

import {
  KuiButton,
  KuiButtonIcon,
} from '../../../../components';

export default () => (
  <div>
    <KuiButton
      type={KuiButton.TYPE.PRIMARY}
      icon={<KuiButtonIcon type={KuiButtonIcon.TYPE.CREATE} />}
    >
      Create
    </KuiButton>

    <br />

    <KuiButton
      type={KuiButton.TYPE.DANGER}
      icon={<KuiButtonIcon type={KuiButtonIcon.TYPE.DELETE} />}
    >
      Delete
    </KuiButton>

    <br />

    <KuiButton
      type={KuiButton.TYPE.BASIC}
      icon={<KuiButtonIcon type={KuiButtonIcon.TYPE.PREVIOUS} />}
    >
      Previous
    </KuiButton>

    <br />

    <KuiButton
      type={KuiButton.TYPE.BASIC}
      icon={<KuiButtonIcon type={KuiButtonIcon.TYPE.NEXT} />}
      isIconOnRight
    >
      Next
    </KuiButton>

    <br />

    <KuiButton
      type={KuiButton.TYPE.BASIC}
      icon={<KuiButtonIcon type={KuiButtonIcon.TYPE.LOADING} />}
    >
      Loading
    </KuiButton>

    <br />

    <KuiButton
      type={KuiButton.TYPE.BASIC}
      icon={<KuiButtonIcon className="fa-plane" />}
    />
  </div>
);
