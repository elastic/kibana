import React from 'react';

import {
  KuiLocalNav,
  KuiLocalNavRow,
  KuiLocalNavRowSection,
} from '../../../../components';

export function LocalNavWithDropdownPanels() {
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
            <div className="kuiLocalMenuItem kuiLocalMenuItem-isSelected">New</div>
            <div className="kuiLocalMenuItem">Save</div>
            <div className="kuiLocalMenuItem">Open</div>
            <button className="kuiLocalMenuItem">
              <div className="kuiLocalMenuItem__icon kuiIcon fa-clock-o"></div>
              Last 5 minutes
            </button>
          </div>
        </KuiLocalNavRowSection>
      </KuiLocalNavRow>
      <div className="kuiLocalDropdown">
        {/* Dropdown close button */}
        <button className="kuiLocalDropdownCloseButton">
          <span className="fa fa-chevron-circle-up"></span>
        </button>

        <div className="kuiLocalDropdownPanels">
          {/* Left panel */}
          <div className="kuiLocalDropdownPanel kuiLocalDropdownPanel--left">
            {/* Title */}
            <div className="kuiLocalDropdownTitle">Left panel</div>

            {/* Help text */}
            <div className="kuiLocalDropdownHelpText">
              Here's some help text to explain the purpose of the dropdown.
            </div>
          </div>

          {/* Right panel */}
          <div className="kuiLocalDropdownPanel kuiLocalDropdownPanel--left">
            {/* Title */}
            <div className="kuiLocalDropdownTitle">Right panel</div>

            {/* Help text */}
            <div className="kuiLocalDropdownHelpText">
              Here's some help text to explain the purpose of the dropdown.
            </div>
          </div>
        </div>
      </div>
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
