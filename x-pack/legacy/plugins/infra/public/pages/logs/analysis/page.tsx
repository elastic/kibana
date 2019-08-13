/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import chrome from 'ui/chrome';
import i18n from '@elastic/i18n';
import { ColumnarPage } from '../../../components/page';
import { LoadingPage } from '../../../components/loading_page';
import { AnalysisPageProviders } from './page_providers';
import { AnalysisResultsContent } from './page_results_content';
import { AnalysisSetupContent } from './page_setup_content';
import { useLogAnalysisJobs } from '../../../containers/logs/log_analysis/log_analysis_jobs';
import { Source } from '../../../containers/source';

export const AnalysisPage = () => {
  const { sourceId, source } = useContext(Source.Context);
  const spaceId = chrome.getInjected('activeSpace').space.id;
  const { isSetupRequired, isLoadingSetupStatus } = useLogAnalysisJobs({
    indexPattern: source ? source.configuration.logAlias : '',
    sourceId,
    spaceId,
  });

  return (
    <AnalysisPageProviders>
      <ColumnarPage data-test-subj="infraLogsAnalysisPage">
        {isLoadingSetupStatus ? (
          <LoadingPage
            message={i18n.translate('xpack.infra.logs.analysisPage.loadingMessage', {
              defaultMessage: 'Checking status of analysis jobs...',
            })}
          />
        ) : isSetupRequired ? (
          <AnalysisSetupContent />
        ) : (
          <AnalysisResultsContent sourceId={sourceId} />
        )}
      </ColumnarPage>
    </AnalysisPageProviders>
  );
};
