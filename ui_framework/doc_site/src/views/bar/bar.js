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
      <label htmlFor="limitInputField">Limit to</label>
      <input id="limitInputField" className="kuiTextInput" size="2" value="10" readOnly/>
      <div>pages</div>
    </KuiBarSection>
  </KuiBar>
);
