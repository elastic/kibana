import React from 'react';

import {
  KuiToast,
} from '../../../../components';

export default () => (
  <div>
    <KuiToast
      title="Example of a good toast"
      onClose={() => window.alert('Dismiss toast')}
    >
      <p>
        A good toast message is short and to the point. It should very rarely include multiple
        paragraphs.
      </p>
    </KuiToast>
  </div>
);
