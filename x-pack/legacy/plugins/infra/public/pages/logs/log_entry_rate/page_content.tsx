/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useContext, useEffect } from 'react';

import { isSetupStatusWithResults } from '../../../../common/log_analysis';
import { LoadingPage } from '../../../components/loading_page';
import { LogAnalysisCapabilities } from '../../../containers/logs/log_analysis';
import { Source } from '../../../containers/source';
import { LogEntryRateResultsContent } from './page_results_content';
import { LogEntryRateSetupContent } from './page_setup_content';
import { LogEntryRateUnavailableContent } from './page_unavailable_content';
import { LogEntryRateSetupStatusUnknownContent } from './page_setup_status_unknown';
import { useLogEntryRateModuleContext } from './use_log_entry_rate_module';

export const LogEntryRatePageContent = () => {
  const { sourceId } = useContext(Source.Context);
  const { hasLogAnalysisCapabilites } = useContext(LogAnalysisCapabilities.Context);

  const {
    cleanUpAndSetUpModule: cleanupAndSetup,
    fetchJobStatus,
    fetchModuleDefinition,
    lastSetupErrorMessages,
    moduleDescriptor,
    setUpModule,
    setupStatus,
    sourceConfiguration,
    viewResults,
  } = useLogEntryRateModuleContext();

  useEffect(() => {
    fetchModuleDefinition();
    fetchJobStatus();
  }, []);

  if (!hasLogAnalysisCapabilites) {
    return <LogEntryRateUnavailableContent />;
  } else if (setupStatus === 'initializing') {
    return (
      <LoadingPage
        message={i18n.translate('xpack.infra.logs.analysisPage.loadingMessage', {
          defaultMessage: 'Checking status of analysis jobs...',
        })}
      />
    );
  } else if (setupStatus === 'unknown') {
    return <LogEntryRateSetupStatusUnknownContent retry={fetchJobStatus} />;
  } else if (isSetupStatusWithResults(setupStatus)) {
    return (
      <LogEntryRateResultsContent
        sourceId={sourceId}
        isFirstUse={setupStatus === 'hiddenAfterSuccess'}
      />
    );
  } else {
    return (
      <LogEntryRateSetupContent
        cleanupAndSetup={cleanupAndSetup}
        errorMessages={lastSetupErrorMessages}
        moduleDescriptor={moduleDescriptor}
        setup={setUpModule}
        setupStatus={setupStatus}
        sourceConfiguration={sourceConfiguration}
        viewResults={viewResults}
      />
    );
  }
};
