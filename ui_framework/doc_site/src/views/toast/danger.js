import React from 'react';

import {
  KuiLink,
  KuiToast,
} from '../../../../components';

export default () => (
  <KuiToast
    title="Save failed"
    type="danger"
  >
    <p>
      Check your form for validation errors.
    </p>

    <p>
      And some other stuff on another line, just for kicks. And <KuiLink href="#">here&rsquo;s a link</KuiLink>.
    </p>
  </KuiToast>
);
