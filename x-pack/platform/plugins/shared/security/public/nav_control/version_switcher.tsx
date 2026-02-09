/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelect, EuiThemeProvider } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { useVersion } from './version_context';

const fixedBottomContainer = css`
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  justify-content: center;
`;

const selectStyles = css`
  min-width: 300px;
  border-radius: 9999px !important;
  
  & .euiSelect {
    border-radius: 9999px !important;
    width: 300px;
  }
  
  & input {
    border-radius: 9999px !important;
  }
  
  & select {
    width: 300px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }
  
  & option {
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }
`;

export const VersionSwitcher: React.FC = () => {
  const { version, setVersion } = useVersion();

  const options = [
    { value: 'current', text: 'Current' },
    { value: '1', text: 'v.1 (nav pref-s in primary nav)' },
    { value: '2', text: 'v.2 (nav pref-s in a profile)' },
    { value: '3', text: 'v.3 (nav pref-s in appearance, edit profile separate)' },
  ];

  // Find the selected option text for tooltip
  const selectedOption = options.find((opt) => opt.value === version);
  const selectedText = selectedOption?.text || '';

  return (
    <div css={fixedBottomContainer} data-test-subj="versionSwitcherContainer">
      <EuiThemeProvider colorMode="dark">
        <div css={selectStyles}>
          <EuiSelect
            id="ui-version-switcher"
            options={options}
            value={version}
            onChange={(e) => setVersion(e.target.value as 'current' | '1' | '2' | '3')}
            aria-label="Switch UI version"
            data-test-subj="uiVersionSwitcher"
            style={{ borderRadius: '9999px', width: '300px' }}
            title={selectedText}
          />
        </div>
      </EuiThemeProvider>
    </div>
  );
};
