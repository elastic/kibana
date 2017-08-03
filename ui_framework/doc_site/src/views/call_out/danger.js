import React from 'react';

import {
  KuiCallOut,
  KuiLink,
  KuiText,
} from '../../../../components';

export default () => (
  <KuiCallOut
    title="Sorry, there was an error"
    type="danger"
    iconType="cross"
  >
    <KuiText size="small">
      <p>
         Now you have to fix it, but maybe <KuiLink href="#">this link can help</KuiLink>.
      </p>
    </KuiText>
  </KuiCallOut>
);
