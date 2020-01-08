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
import { LogEntryCategoriesSetupContent } from './page_setup_content';
import { useLogEntryCategoriesModuleContext } from './use_log_entry_categories_module';

export const LogEntryCategoriesPageContent = () => {
  const { hasLogAnalysisCapabilites } = useContext(LogAnalysisCapabilities.Context);

  const {
    fetchJobStatus,
    fetchModuleDefinition,
    setupStatus,
  } = useLogEntryCategoriesModuleContext();

  useEffect(() => {
    fetchModuleDefinition();
    fetchJobStatus();
  }, [fetchJobStatus, fetchModuleDefinition]);

  if (!hasLogAnalysisCapabilites) {
    return <MlUnavailablePrompt />;
  } else if (setupStatus === 'initializing') {
    return (
      <LoadingPage
        message={i18n.translate('xpack.infra.logs.logEntryCategories.jobStatusLoadingMessage', {
          defaultMessage: 'Checking status of categorization jobs...',
        })}
      />
    );
  } else if (setupStatus === 'unknown') {
    return <LogAnalysisSetupStatusUnknownPrompt retry={fetchJobStatus} />;
  } else if (isSetupStatusWithResults(setupStatus)) {
    return null;
    // return <LogEntryCategoriesResultsContent />;
  } else {
    return <LogEntryCategoriesSetupContent />;
  }
};
