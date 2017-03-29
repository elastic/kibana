import React from 'react';

import {
  KuiButton,
  KuiButtonIcon,
} from '../../../../components';

export default () => (
  <div>
    <KuiButton
      type="primary"
      icon={<KuiButtonIcon type="create" />}
    >
      Create
    </KuiButton>

    <br />

    <KuiButton
      type="danger"
      icon={<KuiButtonIcon type="delete" />}
    >
      Delete
    </KuiButton>

    <br />

    <KuiButton
      type="basic"
      icon={<KuiButtonIcon type="previous" />}
    >
      Previous
    </KuiButton>

    <br />

    <KuiButton
      type="basic"
      icon={<KuiButtonIcon type="next" />}
      iconPosition='right'
    >
      Next
    </KuiButton>

    <br />

    <KuiButton
      type="basic"
      icon={<KuiButtonIcon type="loading" />}
    >
      Loading
    </KuiButton>

    <br />

    <KuiButton
      type="basic"
      icon={<KuiButtonIcon className="fa-plane" />}
    />
  </div>
);
