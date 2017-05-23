import React from 'react';

import {
  KuiLocalNav,
  KuiLocalNavRow,
  KuiLocalNavRowSection,
} from '../../../../components';

export function LocalNavWithMenuItemStates() {
  return (
    <KuiLocalNav>
      <KuiLocalNavRow>
        <KuiLocalNavRowSection>
          <div className="kuiLocalBreadcrumbs">
            <div className="kuiLocalBreadcrumb">
              <a className="kuiLocalBreadcrumb__link" href="#">
                Discover
              </a>
            </div>
            <div className="kuiLocalBreadcrumb">
              <span className="kuiLocalBreadcrumb__emphasis">0</span> hits
            </div>
          </div>
        </KuiLocalNavRowSection>
        <KuiLocalNavRowSection>
          <div className="kuiLocalMenu">
            <div className="kuiLocalMenuItem kuiLocalMenuItem-isSelected">New</div>
            <div className="kuiLocalMenuItem">Save</div>
            <div className="kuiLocalMenuItem kuiLocalMenuItem-isDisabled">Open</div>
            <button className="kuiLocalMenuItem">
              <div className="kuiLocalMenuItem__icon kuiIcon fa-clock-o"></div>
              Last 5 minutes
            </button>
          </div>
        </KuiLocalNavRowSection>
      </KuiLocalNavRow>
      <KuiLocalNavRow isSecondary>
        <div className="kuiLocalSearch">
          <input
            className="kuiLocalSearchInput"
            type="text"
            placeholder="Filter..."
            autoComplete="off"
          />
          <button className="kuiLocalSearchButton">
            <span className="kuiIcon fa-search"></span>
          </button>
        </div>
      </KuiLocalNavRow>
    </KuiLocalNav>
  );
}
