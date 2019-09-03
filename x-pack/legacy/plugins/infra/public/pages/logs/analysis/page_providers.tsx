/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import chrome from 'ui/chrome';

import { LogAnalysisJobs } from '../../../containers/logs/log_analysis';
import { Source } from '../../../containers/source';

export const AnalysisPageProviders: React.FunctionComponent = ({ children }) => {
  const { sourceId, source } = useContext(Source.Context);
  const spaceId = chrome.getInjected('activeSpace').space.id;

  return (
    <LogAnalysisJobs.Provider
      indexPattern={source ? source.configuration.logAlias : ''}
      sourceId={sourceId}
      spaceId={spaceId}
      timeField={source ? source.configuration.fields.timestamp : ''}
    >
      {children}
    </LogAnalysisJobs.Provider>
  );
};
