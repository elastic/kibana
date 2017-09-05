import React from 'react';

import {
  KuiSpacer,
  KuiText,
  KuiTextColor,
  KuiTitle,
} from '../../../../components';

export default () => (
  <div>
    <KuiTitle>
      <h2>
        <KuiTextColor color="default">You </KuiTextColor>
        <KuiTextColor color="primary">can </KuiTextColor>
        <KuiTextColor color="secondary">use </KuiTextColor>
        <KuiTextColor color="accent">it </KuiTextColor>
        <KuiTextColor color="warning">on </KuiTextColor>
        <KuiTextColor color="danger">anything!</KuiTextColor>
      </h2>
    </KuiTitle>

    <KuiSpacer size="l" />

    <KuiText>
      <p>
        <KuiTextColor color="default">
          Default text color
        </KuiTextColor>
      </p>
      <p>
        <KuiTextColor color="subdued">
          Subdued text color
        </KuiTextColor>
      </p>
      <p>
        <KuiTextColor color="primary">
          Primary text color
        </KuiTextColor>
      </p>
      <p>
        <KuiTextColor color="secondary">
          Secondary text color
        </KuiTextColor>
      </p>
      <p>
        <KuiTextColor color="accent">
          Accent text color
        </KuiTextColor>
      </p>
      <p>
        <KuiTextColor color="warning">
          Warning text color
        </KuiTextColor>
      </p>
      <p>
        <KuiTextColor color="danger">
          Danger text color
        </KuiTextColor>
      </p>
    </KuiText>
  </div>
);
