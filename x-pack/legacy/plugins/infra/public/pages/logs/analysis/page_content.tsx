/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useContext, useState, useCallback } from 'react';

import { LoadingPage } from '../../../components/loading_page';
import { LogAnalysisCapabilities, LogAnalysisJobs } from '../../../containers/logs/log_analysis';
import { Source } from '../../../containers/source';
import { AnalysisResultsContent } from './page_results_content';
import { AnalysisSetupContent } from './page_setup_content';
import { AnalysisUnavailableContent } from './page_unavailable_content';

export const AnalysisPageContent = () => {
  const { sourceId, source } = useContext(Source.Context);
  const { hasLogAnalysisCapabilites } = useContext(LogAnalysisCapabilities.Context);

  const {
    isSetupRequired,
    isLoadingSetupStatus,
    setup,
    isSettingUpMlModule,
    didSetupFail,
    hasCompletedSetup,
    hasAttemptedSetup,
    retry,
    isRetrying,
  } = useContext(LogAnalysisJobs.Context);

  const [isViewingResults, setIsViewingResults] = useState<boolean>(false);
  const viewResults = useCallback(() => setIsViewingResults(true), [setIsViewingResults]);

  if (!hasLogAnalysisCapabilites) {
    return <AnalysisUnavailableContent />;
  } else if (isLoadingSetupStatus) {
    return (
      <LoadingPage
        message={i18n.translate('xpack.infra.logs.analysisPage.loadingMessage', {
          defaultMessage: 'Checking status of analysis jobs...',
        })}
      />
    );
  } else if (isSetupRequired || (hasCompletedSetup && !isViewingResults)) {
    return (
      <AnalysisSetupContent
        didSetupFail={didSetupFail}
        isSettingUp={isSettingUpMlModule}
        setup={setup}
        retry={retry}
        isRetrying={isRetrying}
        hasCompletedSetup={hasCompletedSetup}
        hasAttemptedSetup={hasAttemptedSetup}
        indexPattern={source ? source.configuration.logAlias : ''}
        viewResults={viewResults}
      />
    );
  } else {
    return <AnalysisResultsContent sourceId={sourceId} isFirstUse={isViewingResults} />;
  }
};
