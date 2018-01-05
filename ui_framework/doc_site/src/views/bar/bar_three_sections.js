import React from 'react';

import {
  KuiBar,
  KuiBarSection,
  KuiButton,
  KuiButtonGroup
} from '../../../../components';

export default () => (
  <KuiBar>
    <KuiBarSection>
      <div className="kuiTitle">
      The Great American Novel
      </div>
    </KuiBarSection>

    <KuiBarSection>
      <KuiButtonGroup>
        <KuiButton buttonType="basic">
        Create new page
        </KuiButton>
        <KuiButton buttonType="danger">
        Clear all pages
        </KuiButton>
      </KuiButtonGroup>
    </KuiBarSection>

    <KuiBarSection>
      <label htmlFor="limitInput">Limit to</label>
      <input id="limitInput" className="kuiTextInput" size="2" value="10" readOnly/>
      <div>pages</div>

      <KuiButtonGroup>
        <KuiButton buttonType="basic">
        Undo
        </KuiButton>
        <KuiButton buttonType="basic">
        Redo
        </KuiButton>
      </KuiButtonGroup>
    </KuiBarSection>
  </KuiBar>
);
