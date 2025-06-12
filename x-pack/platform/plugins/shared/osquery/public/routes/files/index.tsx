/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPage, EuiPageBody, EuiPageSection } from '@elastic/eui';

import { FileBrowser } from './file_browser';

export const Files = () => {
  return (
    <EuiPage paddingSize="none">
      <EuiPageBody>
        <EuiPageSection paddingSize="l">
          <FileBrowser />
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
};
