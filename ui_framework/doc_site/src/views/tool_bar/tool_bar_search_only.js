import React from 'react';

import {
  KuiToolBar,
  KuiToolBarSearchBox,
} from '../../../../components';

export const ToolBarSearchOnly = () => (
  <KuiToolBar className="kuiToolBar--searchOnly">
    <KuiToolBarSearchBox onFilter={() => {}}/>
  </KuiToolBar>
);
