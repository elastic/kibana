/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelect, EuiThemeProvider } from '@elastic/eui';
import React from 'react';
import { useVersion } from './version_context';

export const VersionSwitcher: React.FC = () => {
  const { version, setVersion } = useVersion();

  const options = [
    { value: 'current', text: 'Current' },
    { value: '1.1', text: '1.1' },
  ];

  return (
    <EuiThemeProvider colorMode="dark">
      <EuiSelect
        id="ui-version-switcher"
        options={options}
        value={version}
        onChange={(e) => setVersion(e.target.value as 'current' | '1.1')}
        aria-label="Switch UI version"
        data-test-subj="uiVersionSwitcher"
        compressed
        style={{ minWidth: '100px' }}
      />
    </EuiThemeProvider>
  );
};
