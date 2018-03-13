import React from 'react';

import {
  KuiActionItem,
  KuiMenu,
  KuiMenuItem
} from '../../../../components';

export default () => (
  <KuiMenu contained>
    <KuiMenuItem>
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
    </KuiMenuItem>

    <KuiMenuItem>
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
    </KuiMenuItem>

    <KuiMenuItem>
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
    </KuiMenuItem>
  </KuiMenu>
);
