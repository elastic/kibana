import React from 'react';

import {
  KuiFlexGroup,
  KuiFlexItem,
} from '../../../../components';

export default () => (
  <div>
    <KuiFlexGroup>
      <KuiFlexItem grow={false}>This item wont grow</KuiFlexItem>
      <KuiFlexItem>But this item will.</KuiFlexItem>
    </KuiFlexGroup>
  </div>
);
