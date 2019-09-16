/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useContext } from 'react';

import { LoadingPage } from '../../../components/loading_page';
import { LogAnalysisCapabilities, LogAnalysisJobs } from '../../../containers/logs/log_analysis';
import { Source } from '../../../containers/source';
import { AnalysisResultsContent } from './page_results_content';
import { AnalysisSetupContent } from './page_setup_content';
import { AnalysisUnavailableContent } from './page_unavailable_content';

export const AnalysisPageContent = () => {
  const { sourceId, source } = useContext(Source.Context);
  const { hasLogAnalysisCapabilites } = useContext(LogAnalysisCapabilities.Context);

  const { setup, retry, setupStatus, viewResults } = useContext(LogAnalysisJobs.Context);

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
  } else if (setupStatus === 'skipped' || setupStatus === 'hiddenAfterSuccess') {
    return (
      <AnalysisResultsContent
        sourceId={sourceId}
        isFirstUse={setupStatus === 'hiddenAfterSuccess'}
      />
    );
  } else {
    return (
      <AnalysisSetupContent
        setup={setup}
        retry={retry}
        setupStatus={setupStatus}
        indexPattern={source ? source.configuration.logAlias : ''}
        viewResults={viewResults}
      />
    );
  }
};
