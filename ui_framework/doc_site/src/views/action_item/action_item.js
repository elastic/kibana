import React from 'react';

import {
  KuiActionItem
} from '../../../../components';

export default () => (
  <KuiActionItem>
    <p className="kuiText">Item</p>
    <div className="kuiMenuButtonGroup">
      <button className="kuiMenuButton kuiMenuButton--basic">
        Acknowledge
      </button>
      <button className="kuiMenuButton kuiMenuButton--basic">
        Silence
      </button>
      <button className="kuiMenuButton kuiMenuButton--danger">
        Delete
      </button>
    </div>
  </KuiActionItem>
);
