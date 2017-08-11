import React from 'react';

import {
  KuiCollapseButton
} from '../../../../components';

export default () => (
  <div>
    <KuiCollapseButton direction="down"/>
    <KuiCollapseButton direction="up"/>
    <KuiCollapseButton direction="left"/>
    <KuiCollapseButton direction="right"/>
  </div>
);
