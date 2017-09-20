import React from 'react';

import {
  KuiToast,
} from '../../../../components';

export default () => (
  <KuiToast
    title="Icons should be rare"
    type="info"
    iconType="user"
    onClose={() => window.alert('Dismiss toast')}
  >
    <p>
      Icons should be used rarely. They are good for warnings, but when paired with
      long titles they look out of place.
    </p>
  </KuiToast>
);
