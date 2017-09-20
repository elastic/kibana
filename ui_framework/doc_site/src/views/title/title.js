import React from 'react';

import {
  KuiTitle,
  KuiHorizontalRule,
} from '../../../../components';

export default () => (
  <div>
    <KuiTitle size="large">
      <h1>This is a large title</h1>
    </KuiTitle>

    <KuiTitle>
      <h2>This is the default size for title</h2>
    </KuiTitle>

    <KuiTitle size="small">
      <h3>This is a small title</h3>
    </KuiTitle>

    <KuiHorizontalRule />

    <KuiTitle size="large">
      <span>Titles are markup agnostic, they only confer style</span>
    </KuiTitle>
  </div>
);
