import React from 'react';

import {
  KuiPanelSimple,
} from '../../../../components';

export default () => (
  <div>
    <KuiPanelSimple paddingSize="none">
      sizePadding=&quot;none&quot;
    </KuiPanelSimple>

    <br />

    <KuiPanelSimple paddingSize="s">
      sizePadding=&quot;s&quot;
    </KuiPanelSimple>

    <br />

    <KuiPanelSimple paddingSize="m">
      sizePadding=&quot;m&quot;
    </KuiPanelSimple>

    <br />

    <KuiPanelSimple paddingSize="l">
      sizePadding=&quot;l&quot;
    </KuiPanelSimple>

    <br />

    <KuiPanelSimple paddingSize="l" hasShadow>
      sizePadding=&quot;l&quot;, hasShadow
    </KuiPanelSimple>
  </div>
);
