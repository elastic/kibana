import React from 'react';

import {
  KuiIcon,
  KuiKeyPadMenuItemButton,
} from '../../../../components';

export default () => (
  <KuiKeyPadMenuItemButton
    label="Dashboard"
    onClick={() => window.alert('Clicked')}
  >
    <KuiIcon type="dashboardApp" size="large" />
  </KuiKeyPadMenuItemButton>
);
