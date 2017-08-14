import React from 'react';

import {
  KuiLink,
  KuiText,
  KuiToast,
} from '../../../../components';

export default () => (
  <KuiToast
    title="Save failed"
    type="danger"
  >
    <KuiText size="small" verticalRhythm>
      <p>
        Check your form for validation errors.
      </p>
    </KuiText>

    <KuiText size="small">
      <p>
        And some other stuff on another line, just for kicks. And <KuiLink href="#">here&rsquo;s a link</KuiLink>.
      </p>
    </KuiText>
  </KuiToast>
);
