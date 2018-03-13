import React from 'react';

import {
  KuiScreenReaderOnly,
} from '../../../../components';


export default () => (
  <div>
    <p>
      This is the first paragraph. It is visible to all.
    </p>
    <KuiScreenReaderOnly>
      <p>
        This is the second paragraph. It is hidden for sighted users but visible to screen readers.
      </p>
    </KuiScreenReaderOnly>
    <p>
      This is the third paragraph. It is visible to all.
    </p>
  </div>
);

