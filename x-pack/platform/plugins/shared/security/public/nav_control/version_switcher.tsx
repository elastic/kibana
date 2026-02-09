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
  min-width: 180px;
  border-radius: 9999px !important;
  
  & .euiSelect {
    border-radius: 9999px !important;
  }
  
  & input {
    border-radius: 9999px !important;
  }
`;

export const VersionSwitcher: React.FC = () => {
  const { version, setVersion } = useVersion();

  const options = [
    { value: 'current', text: 'Current' },
    { value: '1.1', text: '1.1' },
  ];

  return (
    <div css={fixedBottomContainer} data-test-subj="versionSwitcherContainer">
      <EuiThemeProvider colorMode="dark">
        <div css={selectStyles}>
          <EuiSelect
            id="ui-version-switcher"
            options={options}
            value={version}
            onChange={(e) => setVersion(e.target.value as 'current' | '1.1')}
            aria-label="Switch UI version"
            data-test-subj="uiVersionSwitcher"
            style={{ borderRadius: '9999px' }}
          />
        </div>
      </EuiThemeProvider>
    </div>
  );
};
