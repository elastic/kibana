import React from 'react';

import {
  KuiActionItem
} from '../../../../components';

export default () => (
<div className="kuiMenu kuiMenu--contained">
  <div className="kuiMenuItem">
    <KuiActionItem>
      <p className="kuiText">Item A</p>
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
  </div>

  <div className="kuiMenuItem">
    <KuiActionItem>
      <p className="kuiText">Item B</p>
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
  </div>

  <div className="kuiMenuItem">
    <KuiActionItem>
      <p className="kuiText">Item C</p>
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
  </div>
</div>
);
