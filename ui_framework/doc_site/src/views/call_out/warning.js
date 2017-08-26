import React from 'react';

import {
  KuiCallOut,
  KuiLink,
} from '../../../../components';

export default () => (
  <KuiCallOut
    title="Proceed with caution!"
    type="warning"
    iconType="help"
  >
    <p>
      Here be dragons. Don&rsquo;t wanna mess with no dragons. And <KuiLink href="#">here&rsquo;s a link</KuiLink>.
    </p>
  </KuiCallOut>
);
