import React from 'react';

import {
  KuiPanel,
  KuiCode,
  KuiSpacer,
} from '../../../../components';

export default () => (
  <div>
    <KuiPanel paddingSize="none">
      <KuiCode>sizePadding=&quot;none&quot;</KuiCode>
    </KuiPanel>

    <KuiSpacer size="l"/>

    <KuiPanel paddingSize="s">
      <KuiCode>sizePadding=&quot;s&quot;</KuiCode>
    </KuiPanel>

    <KuiSpacer size="l"/>

    <KuiPanel paddingSize="m">
      <KuiCode>sizePadding=&quot;m&quot;</KuiCode>
    </KuiPanel>

    <KuiSpacer size="l"/>

    <KuiPanel paddingSize="l">
      <KuiCode>sizePadding=&quot;l&quot;</KuiCode>
    </KuiPanel>

    <KuiSpacer size="l"/>

    <KuiPanel paddingSize="l" hasShadow>
      <KuiCode>sizePadding=&quot;l&quot;</KuiCode>, <KuiCode>hasShadow</KuiCode>
    </KuiPanel>
  </div>
);
