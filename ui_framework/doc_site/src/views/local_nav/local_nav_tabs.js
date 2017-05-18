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
