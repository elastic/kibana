/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useContext, useEffect } from 'react';

import { isSetupStatusWithResults } from '../../../../common/log_analysis';
import { LoadingPage } from '../../../components/loading_page';
import { LogAnalysisCapabilities, LogAnalysisJobs } from '../../../containers/logs/log_analysis';
import { Source } from '../../../containers/source';
import { AnalysisResultsContent } from './page_results_content';
import { AnalysisSetupContent } from './page_setup_content';
import { AnalysisUnavailableContent } from './page_unavailable_content';
import { AnalysisSetupStatusUnknownContent } from './page_setup_status_unknown';

export const AnalysisPageContent = () => {
  const { sourceId } = useContext(Source.Context);
  const { hasLogAnalysisCapabilites } = useContext(LogAnalysisCapabilities.Context);

  const {
    availableIndices,
    cleanupAndSetup,
    fetchJobStatus,
    lastSetupErrorMessages,
    setup,
    setupStatus,
    timestampField,
    viewResults,
  } = useContext(LogAnalysisJobs.Context);

  useEffect(() => {
    fetchJobStatus();
  }, []);

  if (!hasLogAnalysisCapabilites) {
    return <AnalysisUnavailableContent />;
  } else if (setupStatus === 'initializing') {
    return (
      <LoadingPage
        message={i18n.translate('xpack.infra.logs.analysisPage.loadingMessage', {
          defaultMessage: 'Checking status of analysis jobs...',
        })}
      />
    );
  } else if (setupStatus === 'unknown') {
    return <AnalysisSetupStatusUnknownContent retry={fetchJobStatus} />;
  } else if (isSetupStatusWithResults(setupStatus)) {
    return (
      <AnalysisResultsContent
        sourceId={sourceId}
        isFirstUse={setupStatus === 'hiddenAfterSuccess'}
      />
    );
  } else {
    return (
      <AnalysisSetupContent
        availableIndices={availableIndices}
        cleanupAndSetup={cleanupAndSetup}
        errorMessages={lastSetupErrorMessages}
        setup={setup}
        setupStatus={setupStatus}
        timestampField={timestampField}
        viewResults={viewResults}
      />
    );
  }
};
