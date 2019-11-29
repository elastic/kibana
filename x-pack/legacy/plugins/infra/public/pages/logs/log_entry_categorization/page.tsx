/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { ColumnarPage } from '../../../components/page';
// import { LogEntryCategorizationPageContent } from './page_content';
import { LogEntryCategorizationPageProviders } from './page_providers';

export const LogEntryCategorizationPageProvidersPage = () => {
  return (
    <LogEntryCategorizationPageProviders>
      <ColumnarPage data-test-subj="logsLogEntryCategorizationPage">
        {/* <LogEntryCategorizationPageContent /> */}
      </ColumnarPage>
    </LogEntryCategorizationPageProviders>
  );
};
