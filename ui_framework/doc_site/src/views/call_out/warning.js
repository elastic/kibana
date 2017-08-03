import React from 'react';

import {
  KuiCallOut,
  KuiLink,
  KuiText,
} from '../../../../components';

export default () => (
  <KuiCallOut
    title="Proceed with caution!"
    type="warning"
    iconType="help"
  >
    <KuiText size="small">
      <p>
        Here be dragons. Don&rsquo;t wanna mess with no dragons. And <KuiLink href="#">here&rsquo;s a link</KuiLink>.
      </p>
    </KuiText>
  </KuiCallOut>
);
