import React from 'react';

import {
  KuiCallOut,
  KuiLink,
  KuiText,
} from '../../../../components';

export default () => (
  <KuiCallOut
    title="Good news, everyone!"
    type="success"
    iconType="user"
  >
    <KuiText size="small">
      <p>
        I have no news. Which is good! And <KuiLink href="#">here&rsquo;s a link</KuiLink>.
      </p>
    </KuiText>
  </KuiCallOut>
);
