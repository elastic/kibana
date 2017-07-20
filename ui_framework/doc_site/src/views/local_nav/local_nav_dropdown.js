import React from 'react';

import {
  KuiLocalNav,
  KuiLocalNavRow,
  KuiLocalNavRowSection,
} from '../../../../components';

export function LocalNavWithDropdown() {
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

        {/* Title */}
        <div className="kuiLocalDropdownTitle">Dropdown title</div>

        {/* Help text */}
        <div className="kuiLocalDropdownHelpText">
          Here's some help text to explain the purpose of the dropdown.
        </div>

        {/* Warning */}
        <div className="kuiLocalDropdownWarning">
          Here's some warning text in case the user has something misconfigured.
        </div>

        <div className="kuiLocalDropdownSection">
          {/* Header */}
          <div className="kuiLocalDropdownHeader">
            <div className="kuiLocalDropdownHeader__label">
              Header for a section of content
            </div>
          </div>

          {/* Input */}
          <input
            className="kuiLocalDropdownInput"
            type="text"
            placeholder="Input something here"
          />
        </div>

        <div className="kuiLocalDropdownSection">
          {/* Header */}
          <div className="kuiLocalDropdownHeader">
            <div className="kuiLocalDropdownHeader__label">
              Header for another section of content
            </div>
            <div className="kuiLocalDropdownHeader__actions">
              <a
                className="kuiLocalDropdownHeader__action"
                href=""
              >
                Action A
              </a>
              <a
                className="kuiLocalDropdownHeader__action"
                href=""
              >
                Action B
              </a>
            </div>
          </div>

          <input
            className="kuiLocalDropdownInput"
            type="text"
            readOnly
            value="This is some text inside of a read-only input"
          />

          {/* Notes */}
          <div className="kuiLocalDropdownFormNote">
            Here are some notes to explain the purpose of this section of the dropdown.
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
