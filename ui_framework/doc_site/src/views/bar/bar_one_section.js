import React from 'react';

import {
  KuiBar,
  KuiBarSection
} from '../../../../components';

export default () => (
 <KuiBar>
  <KuiBarSection>
    <div className="kuiButtonGroup">
      <button className="kuiButton kuiButton--basic">
        See previous 10 pages
      </button>
      <button className="kuiButton kuiButton--basic">
        See next 10 pages
      </button>
    </div>
  </KuiBarSection>
</KuiBar>
);
