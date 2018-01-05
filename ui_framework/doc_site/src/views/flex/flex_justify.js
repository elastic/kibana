import React from 'react';

import {
  KuiFlexGroup,
  KuiFlexItem,
} from '../../../../components';

export default () => (
  <div>
    <KuiFlexGroup justifyContent="spaceBetween">
      <KuiFlexItem grow={false}>One here on the left</KuiFlexItem>
      <KuiFlexItem grow={false}>The other over here on the right.</KuiFlexItem>
    </KuiFlexGroup>

    <br/><br/>

    <KuiFlexGroup justifyContent="spaceAround">
      <KuiFlexItem grow={false}>I&rsquo;m a single centered item!</KuiFlexItem>
    </KuiFlexGroup>

    <br/><br/>

    <KuiFlexGroup alignItems="center">
      <KuiFlexItem grow={false}>
        <div>
          <p>I</p>
          <p>am</p>
          <p>really</p>
          <p>tall</p>
        </div>
      </KuiFlexItem>
      <KuiFlexItem>I am vertically centered!</KuiFlexItem>
    </KuiFlexGroup>
  </div>
);
