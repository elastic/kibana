import React from 'react';

import {
  KuiText,
  KuiToast,
} from '../../../../components';

export default () => (
  <div>
    <KuiToast
      title="Example of a good toast"
      onClose={() => window.alert('Dismiss toast')}
    >
      <KuiText size="small">
        <p>
          A good toast message is short and to the point. It should very rarely include multiple
          paragraphs.
        </p>
      </KuiText>
    </KuiToast>
  </div>
);
