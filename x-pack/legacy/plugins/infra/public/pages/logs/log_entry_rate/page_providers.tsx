/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useSourceContext } from '../../../containers/source';
import { useKibanaSpaceId } from '../../../utils/use_kibana_space_id';
import { LogEntryRateJobsProvider } from './use_log_entry_rate_jobs';

export const LogEntryRatePageProviders: React.FunctionComponent = ({ children }) => {
  const { sourceId, source } = useSourceContext();
  const spaceId = useKibanaSpaceId();

  return (
    <LogEntryRateJobsProvider
      indexPattern={source ? source.configuration.logAlias : ''}
      sourceId={sourceId}
      spaceId={spaceId}
      timeField={source ? source.configuration.fields.timestamp : ''}
    >
      {children}
    </LogEntryRateJobsProvider>
  );
};
