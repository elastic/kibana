import React from 'react';

import {
  KuiBar,
  KuiBarSection
} from '../../../../components';

export default () => (
 <KuiBar>
  <KuiBarSection>
    <div className="kuiTitle">
      The Great American Novel
    </div>
  </KuiBarSection>

  <KuiBarSection>
    <div className="kuiButtonGroup">
      <button className="kuiButton kuiButton--basic">
        Create new page
      </button>
      <button className="kuiButton kuiButton--danger">
        Clear all pages
      </button>
    </div>
  </KuiBarSection>

  <KuiBarSection>
    <div>Limit to</div>
    <input className="kuiTextInput" size="2" value="10" readOnly/>
    <div>pages</div>

    <div className="kuiButtonGroup">
      <button className="kuiButton kuiButton--basic">
        Undo
      </button>
      <button className="kuiButton kuiButton--basic">
        Redo
      </button>
    </div>
  </KuiBarSection>
</KuiBar>
);
