/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { last } from 'lodash';
import chrome from 'ui/chrome';
import { ColumnarPage } from '../../../components/page';
import { AnalysisPageProviders } from './page_providers';
import { AnalysisResultsContent } from './page_results_content';
import { AnalysisSetupContent } from './page_setup_content';
import { useLogAnalysisJobs } from '../../../containers/logs/log_analysis/log_analysis_jobs';
import { Source } from '../../../containers/source';

export const AnalysisPage = () => {
  const { sourceId, source } = useContext(Source.Context);
  // TODO: Find out the proper Kibana way to derive the space ID client side
  const basePath = chrome.getBasePath();
  const spaceId = basePath.includes('s/') ? last(basePath.split('/')) : 'default';
  const { isSetupRequired, isLoadingSetupStatus } = useLogAnalysisJobs({
    indexPattern: source.configuration.logAlias,
    sourceId,
    spaceId,
  });

  return (
    <AnalysisPageProviders>
      <ColumnarPage data-test-subj="infraLogsAnalysisPage">
        {isLoadingSetupStatus ? (
          <div>Checking status...</div>
        ) : isSetupRequired ? (
          <AnalysisSetupContent />
        ) : (
          <AnalysisResultsContent />
        )}
      </ColumnarPage>
    </AnalysisPageProviders>
  );
};
