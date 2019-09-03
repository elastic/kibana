/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { ColumnarPage } from '../../../components/page';
import { StreamPageContent } from './page_content';
import { StreamPageHeader } from './page_header';
import { LogsPageProviders } from './page_providers';
import { useTrackPageview } from '../../../hooks/use_track_metric';

export const StreamPage = () => {
  useTrackPageview({ app: 'infra_logs', path: 'stream' });
  useTrackPageview({ app: 'infra_logs', path: 'stream', delay: 15000 });
  return (
    <LogsPageProviders>
      <ColumnarPage data-test-subj="infraLogsPage">
        <StreamPageHeader />
        <StreamPageContent />
      </ColumnarPage>
    </LogsPageProviders>
  );
};
