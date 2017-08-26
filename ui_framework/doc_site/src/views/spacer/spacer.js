import React from 'react';

import {
  KuiSpacer,
} from '../../../../components';

export default () => (
  <div>
    <p>xs: 4px</p>
    <KuiSpacer size="xs"/>

    <br />
    <br />

    <p>s: 8px</p>
    <KuiSpacer size="s" />

    <br />
    <br />

    <p>m: 16px</p>
    <KuiSpacer size="m" />

    <br />
    <br />

    <p>l: 24px</p>
    <KuiSpacer size="l" />

    <br />
    <br />

    <p>xl: 32px</p>
    <KuiSpacer size="xl" />

    <br />
    <br />
    <p>xxl: 40px</p>
    <KuiSpacer size="xxl" />
  </div>
);
