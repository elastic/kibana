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
            <button className="kuiLocalMenuItem">New</button>
            <button className="kuiLocalMenuItem">Save</button>
            <button className="kuiLocalMenuItem">Open</button>
            <button className="kuiLocalMenuItem">
              <div className="kuiLocalMenuItem__icon kuiIcon fa-clock-o" />
              September 29, 2017, 12:21.05.696 to November 28, 2019 11:03:22.108
            </button>
          </div>
        </KuiLocalNavRowSection>
      </KuiLocalNavRow>
    </KuiLocalNav>
  );
}
