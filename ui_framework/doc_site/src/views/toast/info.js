import React from 'react';

import {
  KuiText,
  KuiToast,
} from '../../../../components';

export default () => (
  <KuiToast
    title="Icons should be rare"
    type="info"
    iconType="user"
    onClose={() => window.alert('Dismiss toast')}
  >
    <KuiText size="small">
      <p>
        Icons should be used rarely. They're good for warnings, but when paired with
        long titles they look out of place.
      </p>
    </KuiText>

  </KuiToast>
);
