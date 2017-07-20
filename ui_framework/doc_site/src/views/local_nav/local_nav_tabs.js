import React from 'react';

import {
  KuiLocalNav,
  KuiLocalNavRow,
  KuiLocalNavRowSection,
  KuiLocalTab,
  KuiLocalTabs,
} from '../../../../components';

export function LocalNavWithTabs() {
  return (
    <KuiLocalNav>
      <KuiLocalNavRow>
        <KuiLocalNavRowSection>
          <div className="kuiLocalBreadcrumbs">
            <h1 tabindex="0" id="kui_local_breadcrumb" className="kuiLocalBreadcrumb">
              <a className="kuiLocalBreadcrumb__link" href="#">
                Discover
              </a>
            </h1>
            <h1 tabindex="0" id="kui_local_breadcrumb" className="kuiLocalBreadcrumb">
              <span className="kuiLocalBreadcrumb__emphasis">0</span> hits
            </h1>
          </div>
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
      <KuiLocalNavRow isSecondary>
        <KuiLocalTabs>
          <KuiLocalTab href="#" isSelected>
            Overview
          </KuiLocalTab>
          <KuiLocalTab href="#">
            Your Documents
          </KuiLocalTab>
          <KuiLocalTab href="#" isDisabled>
            Another Tab
          </KuiLocalTab>
        </KuiLocalTabs>
      </KuiLocalNavRow>
    </KuiLocalNav>
  );
}
