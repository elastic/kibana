import React from 'react';

import {
  KuiFlexGroup,
  KuiFlexItem,
} from '../../../../components';

export default () => (
  <KuiFlexGroup wrap>
    <KuiFlexItem style={{ minWidth: 300 }}>
      Min-width 300px
    </KuiFlexItem>

    <KuiFlexItem style={{ minWidth: 300 }}>
      Min-width 300px
    </KuiFlexItem>

    <KuiFlexItem style={{ minWidth: 300 }}>
      Min-width 300px
    </KuiFlexItem>
  </KuiFlexGroup>
);
