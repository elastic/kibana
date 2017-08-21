import React from 'react';

import {
  KuiFlexGroup,
  KuiFlexItem,
} from '../../../../components';

export default () => (
  <div>
    <KuiFlexGroup growItems={false}>
      <KuiFlexItem>These items...</KuiFlexItem>
      <KuiFlexItem>... will auto size to the size of their content.</KuiFlexItem>
    </KuiFlexGroup>
  </div>
);

