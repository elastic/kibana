import React from 'react';

import {
  KuiFlexItem,
  KuiFlexGroup,
  KuiPanel,
  KuiCode,
  KuiText,
} from '../../../../components';

export default () => (
  <KuiFlexGroup>
    <KuiFlexItem>
      <KuiText>
        <p><KuiCode>FlexItem</KuiCode></p>
        <p>A side nav might be in this one.</p>
        <p>And you would want the panel on the right to expand with it.</p>
      </KuiText>
    </KuiFlexItem>

    <KuiFlexItem>
      <KuiPanel>
        <KuiCode>KuiPanel</KuiCode>
      </KuiPanel>
    </KuiFlexItem>

    <KuiFlexItem>
      <KuiPanel grow={false}>
        Another <KuiCode>KuiPanel</KuiCode>,
        with <KuiCode>grow=&#123;false&#125;</KuiCode>.
      </KuiPanel>
    </KuiFlexItem>
  </KuiFlexGroup>
);
