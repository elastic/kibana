import React from 'react';

import {
  KuiLocalNav,
  KuiLocalNavRow,
  KuiLocalNavRowSection,
  KuiLocalTitle,
} from '../../../../components';

export function SimpleLocalNav() {
  return (
    <KuiLocalNav>
      <KuiLocalNavRow>
        <KuiLocalNavRowSection>
          <KuiLocalTitle>
            Untitled Document
          </KuiLocalTitle>
        </KuiLocalNavRowSection>
        <KuiLocalNavRowSection>
          <div className="kuiLocalMenu">
            <div className="kuiLocalMenuItem">New</div>
            <div className="kuiLocalMenuItem">Save</div>
            <div className="kuiLocalMenuItem">Open</div>
            <button className="kuiLocalMenuItem">
              <div className="kuiLocalMenuItem__icon kuiIcon fa-clock-o"></div>
              Last 5 minutes
            </button>
          </div>
        </KuiLocalNavRowSection>
      </KuiLocalNavRow>
    </KuiLocalNav>
  );
}
