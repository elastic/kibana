/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useContext, useEffect } from 'react';
import chrome from 'ui/chrome';

import { LoadingPage } from '../../../components/loading_page';
import {
  LogAnalysisCapabilities,
  LogAnalysisJobs,
  useLogAnalysisCleanup,
} from '../../../containers/logs/log_analysis';
import { Source } from '../../../containers/source';
import { AnalysisResultsContent } from './page_results_content';
import { AnalysisSetupContent } from './page_setup_content';
import { AnalysisUnavailableContent } from './page_unavailable_content';

export const AnalysisPageContent = () => {
  const { sourceId, source } = useContext(Source.Context);
  const { hasLogAnalysisCapabilites } = useContext(LogAnalysisCapabilities.Context);

  const spaceId = chrome.getInjected('activeSpace').space.id;

  const {
    isSetupRequired,
    isLoadingSetupStatus,
    setupMlModule,
    isSettingUpMlModule,
    didSetupFail,
    hasCompletedSetup,
  } = useContext(LogAnalysisJobs.Context);

  const { cleanupMLResources, isCleaningUp } = useLogAnalysisCleanup({ sourceId, spaceId });
  useEffect(() => {
    if (didSetupFail) {
      cleanupMLResources();
    }
  }, [didSetupFail, cleanupMLResources]);

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
  } else if (isSetupRequired) {
    return (
      <AnalysisSetupContent
        didSetupFail={didSetupFail}
        isSettingUp={isSettingUpMlModule}
        setupMlModule={setupMlModule}
        isCleaningUpAFailedSetup={isCleaningUp}
        indexPattern={source ? source.configuration.logAlias : ''}
      />
    );
  } else {
    return <AnalysisResultsContent sourceId={sourceId} isFirstUse={hasCompletedSetup} />;
  }
};
