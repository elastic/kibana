/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiSteps, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';

import { BetaBadge } from '../../../components/beta_badge';
import {
  createInitialConfigurationStep,
  createProcessStep,
  LogAnalysisSetupPage,
  LogAnalysisSetupPageContent,
  LogAnalysisSetupPageHeader,
} from '../../../components/logging/log_analysis_setup';
import { useTrackPageview } from '../../../hooks/use_track_metric';
import { useLogEntryCategoriesSetup } from './use_log_entry_categories_setup';

export const LogEntryCategoriesSetupContent: React.FunctionComponent = () => {
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_categories_setup' });
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_categories_setup', delay: 15000 });

  const {
    cleanUpAndSetUp,
    endTime,
    isValidating,
    lastSetupErrorMessages,
    setEndTime,
    setStartTime,
    setValidatedIndices,
    setUp,
    setupStatus,
    startTime,
    validatedIndices,
    validationErrors,
    viewResults,
  } = useLogEntryCategoriesSetup();

  const steps = useMemo(
    () => [
      createInitialConfigurationStep({
        setStartTime,
        setEndTime,
        startTime,
        endTime,
        isValidating,
        validatedIndices,
        setupStatus,
        setValidatedIndices,
        validationErrors,
      }),
      createProcessStep({
        cleanUpAndSetUp,
        errorMessages: lastSetupErrorMessages,
        isConfigurationValid: validationErrors.length <= 0,
        setUp,
        setupStatus,
        viewResults,
      }),
    ],
    [
      cleanUpAndSetUp,
      endTime,
      isValidating,
      lastSetupErrorMessages,
      setEndTime,
      setStartTime,
      setUp,
      setValidatedIndices,
      setupStatus,
      startTime,
      validatedIndices,
      validationErrors,
      viewResults,
    ]
  );

  return (
    <LogAnalysisSetupPage data-test-subj="logEntryCategoriesSetupPage">
      <LogAnalysisSetupPageHeader>
        <FormattedMessage
          id="xpack.infra.logs.logEntryCategories.setupTitle"
          defaultMessage="Enable Machine Learning analysis"
        />{' '}
        <BetaBadge />
      </LogAnalysisSetupPageHeader>
      <LogAnalysisSetupPageContent>
        <EuiText size="s">
          <FormattedMessage
            id="xpack.infra.logs.logEntryCategories.setupDescription"
            defaultMessage="Use Machine Learning to automatically categorize log messages."
          />
        </EuiText>
        <EuiSpacer />
        <EuiSteps steps={steps} />
      </LogAnalysisSetupPageContent>
    </LogAnalysisSetupPage>
  );
};
