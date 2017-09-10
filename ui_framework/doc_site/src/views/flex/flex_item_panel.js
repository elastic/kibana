import React from 'react';

import {
  KuiFlexItemPanel,
  KuiFlexGroup,
  KuiFlexItem,
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
    <KuiFlexItemPanel>
      <KuiCode>FlexItemPanel</KuiCode>
    </KuiFlexItemPanel>
    <KuiFlexItemPanel paddingSize="l">
      Another <KuiCode>FlexItemPanel</KuiCode>,
      with <KuiCode>paddingSize=&ldquo;l&rdquo;</KuiCode>.
    </KuiFlexItemPanel>
  </KuiFlexGroup>
);
