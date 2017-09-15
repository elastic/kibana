import React from 'react';

import {
  KuiProgress,
  KuiSpacer,
} from '../../../../components';

export default () => (
  <div>
    <KuiProgress value={20} max={100} color="subdued" size="xs" />
    <KuiSpacer size="l" />

    <KuiProgress value={40} max={100} color="accent" size="xs" />
    <KuiSpacer size="l" />

    <KuiProgress value={60} max={100} color="primary" size="s" />
    <KuiSpacer size="l" />

    <KuiProgress value={80} max={100} color="secondary" size="m" />
    <KuiSpacer size="l" />

    <KuiProgress value={90} max={100} color="danger" size="l" />
  </div>

);
