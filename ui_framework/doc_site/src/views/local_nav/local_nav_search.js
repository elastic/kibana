import React from 'react';

import {
  KuiLocalNav,
  KuiLocalNavRow,
  KuiLocalNavRowSection,
} from '../../../../components';

export function LocalNavWithSearch() {
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
        <div className="kuiLocalSearch">
          <div className="kuiLocalSearchAssistedInput">
            <input
              style={{ paddingRight: '5.5em' }}
              className="kuiLocalSearchInput"
              type="text"
              placeholder="Filter..."
              autoComplete="off"
            />
            <div className="kuiLocalSearchAssistedInput__assistance">
              <p className="kuiText">
                <a className="kuiLink" href="#">API docs</a>
              </p>
            </div>
          </div>

          <input
            className="kuiLocalSearchInput kuiLocalSearchInput--secondary"
            type="text"
            placeholder="Another input"
            autoComplete="off"
            style={{ width: 150 }}
          />

          <select className="kuiLocalSearchSelect">
            <option>Alligator</option>
            <option>Balaclava</option>
            <option>Castanets</option>
          </select>

          <button className="kuiLocalSearchButton">
            <span className="kuiIcon fa-search"></span>
          </button>
        </div>
      </KuiLocalNavRow>
    </KuiLocalNav>
  );
}
