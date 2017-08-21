import React from 'react';

import {
  KuiFlexGroup,
  KuiFlexItem,
} from '../../../../components';

export default () => (
  <div>
    <KuiFlexGroup growItems={false} justifyContent="spaceBetween">
      <KuiFlexItem>One here on the left</KuiFlexItem>
      <KuiFlexItem>The other over here on the right.</KuiFlexItem>
    </KuiFlexGroup>

    <br/><br/>

    <KuiFlexGroup growItems={false} justifyContent="spaceAround">
      <KuiFlexItem>I&rsquo;m a single centered item!</KuiFlexItem>
    </KuiFlexGroup>
  </div>
);
