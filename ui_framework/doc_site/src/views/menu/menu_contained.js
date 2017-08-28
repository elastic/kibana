import React from 'react';

import {
  KuiMenu,
  KuiMenuItem,
} from '../../../../components';

export default () => (
  <div>
    <KuiMenu contained>
      <KuiMenuItem>
        <p className="kuiText">Item A</p>
      </KuiMenuItem>

      <KuiMenuItem>
        <p className="kuiText">Item B</p>
      </KuiMenuItem>

      <KuiMenuItem>
        <p className="kuiText">Item C</p>
      </KuiMenuItem>
    </KuiMenu>
  </div>
);
