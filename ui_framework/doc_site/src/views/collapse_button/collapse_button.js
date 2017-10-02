import React from 'react';

import {
  KuiCollapseButton
} from '../../../../components';

export default () => (
  <div>
    <KuiCollapseButton aria-label="Toggle panel" direction="down"/>
    <KuiCollapseButton aria-label="Toggle panel" direction="up"/>
    <KuiCollapseButton aria-label="Toggle panel" direction="left"/>
    <KuiCollapseButton aria-label="Toggle panel" direction="right"/>
  </div>
);
