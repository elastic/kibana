/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useContext, useEffect } from 'react';

import { isSetupStatusWithResults } from '../../../../common/log_analysis';
import { LoadingPage } from '../../../components/loading_page';
import {
  LogAnalysisSetupStatusUnknownPrompt,
  MlUnavailablePrompt,
} from '../../../components/logging/log_analysis_setup';
import { LogAnalysisCapabilities } from '../../../containers/logs/log_analysis';
// import { Source } from '../../../containers/source';
// import { LogEntryCategoriesResultsContent } from './page_results_content';
// import { LogEntryCategoriesSetupContent } from './page_setup_content';
import { useLogEntryCategoriesModuleContext } from './use_log_entry_categories_module';

export const LogEntryCategoriesPageContent = () => {
  // const { sourceId } = useContext(Source.Context);
  const { hasLogAnalysisCapabilites } = useContext(LogAnalysisCapabilities.Context);

  const {
    // cleanUpAndSetUpModule: cleanupAndSetup,
    fetchJobStatus,
    fetchModuleDefinition,
    // lastSetupErrorMessages,
    // moduleDescriptor,
    // setUpModule,
    setupStatus,
    // sourceConfiguration,
    // viewResults,
  } = useLogEntryCategoriesModuleContext();

  useEffect(() => {
    fetchModuleDefinition();
    fetchJobStatus();
  }, []);

  if (!hasLogAnalysisCapabilites) {
    return <MlUnavailablePrompt />;
  } else if (setupStatus === 'initializing') {
    return (
      <LoadingPage
        message={i18n.translate('xpack.infra.logs.analysisPage.loadingMessage', {
          defaultMessage: 'Checking status of analysis jobs...',
        })}
      />
    );
  } else if (setupStatus === 'unknown') {
    return <LogAnalysisSetupStatusUnknownPrompt retry={fetchJobStatus} />;
  } else if (isSetupStatusWithResults(setupStatus)) {
    return null;
    // return (
    //   <LogEntryCategoriesResultsContent
    //     sourceId={sourceId}
    //     isFirstUse={setupStatus === 'hiddenAfterSuccess'}
    //   />
    // );
  } else {
    return null;
    // return (
    //   <LogEntryCategoriesSetupContent
    //     cleanupAndSetup={cleanupAndSetup}
    //     errorMessages={lastSetupErrorMessages}
    //     moduleDescriptor={moduleDescriptor}
    //     setup={setUpModule}
    //     setupStatus={setupStatus}
    //     sourceConfiguration={sourceConfiguration}
    //     viewResults={viewResults}
    //   />
    // );
  }
};
