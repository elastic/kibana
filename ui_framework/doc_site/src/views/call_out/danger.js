import React from 'react';

import {
  KuiCallOut,
  KuiLink,
} from '../../../../components';

export default () => (
  <KuiCallOut
    title="Sorry, there was an error"
    type="danger"
    iconType="cross"
  >
    <p>
       Now you have to fix it, but maybe <KuiLink href="#">this link can help</KuiLink>.
    </p>
  </KuiCallOut>
);
