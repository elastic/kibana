/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { JobSuggestion } from '../../../../../common/types/job_suggestions';
import {
  useMlKibana,
  useMlManagementLocator,
  useNotifications,
} from '../../../../application/contexts/kibana';
import { useJobsApiService } from '../../../../application/services/ml_api_service/jobs';
import { getWizardPath, stashSuggestion } from '../open_suggestion_in_wizard';
import { DEFAULT_SUGGESTION_TIME_RANGE, JobSuggestionService } from '../job_suggestion_service';
import type { SuggestionTimeRange } from '../job_suggestion_service';
import { useSuggestionHistory } from '../use_suggestion_history';
import { PreviousRun } from './previous_run';
import { SuggestionCards } from './suggestion_cards';

interface Props {
  onClose: () => void;
  indexPattern: string;
  dataViewId?: string;
  savedSearchId?: string;
  projectRouting?: string;
}

export const SuggestADJobsFlyout: FC<Props> = ({
  onClose,
  indexPattern,
  dataViewId,
  savedSearchId,
  projectRouting,
}) => {
  const {
    services: {
      data: {
        dataViews,
        query: {
          timefilter: { timefilter },
        },
      },
    },
  } = useMlKibana();
  const jobsApi = useJobsApiService();
  const { toasts } = useNotifications();
  const mlManagementLocator = useMlManagementLocator();
  const [timeRange, setTimeRange] = useState<SuggestionTimeRange>(DEFAULT_SUGGESTION_TIME_RANGE);
  const jobSuggestionService = useMemo(
    () => new JobSuggestionService(jobsApi, timefilter),
    [jobsApi, timefilter]
  );
  const state = useObservable(jobSuggestionService.state$, jobSuggestionService.state);

  useEffect(() => {
    void jobSuggestionService.suggest(indexPattern, timeRange);
    // Closing the flyout, or asking for something else, stops the analysis which is in progress.
    return () => jobSuggestionService.cancel();
  }, [jobSuggestionService, indexPattern, timeRange]);

  const previousRun = useSuggestionHistory(indexPattern, state);

  const openInWizard = useCallback(
    async (suggestion: JobSuggestion) => {
      try {
        let resolvedDataViewId = dataViewId;
        if (!resolvedDataViewId && !savedSearchId) {
          const matches = await dataViews.find(indexPattern);
          resolvedDataViewId = matches.find(
            (dataView) => dataView.getIndexPattern() === indexPattern
          )?.id;
          if (!resolvedDataViewId) {
            throw new Error(
              i18n.translate('xpack.ml.suggestADJobsFlyout.noDataViewError', {
                defaultMessage:
                  'There is no data view for {indexPattern}. Create one, then try again.',
                values: { indexPattern },
              })
            );
          }
        }

        stashSuggestion(suggestion);
        onClose();
        await mlManagementLocator?.navigate({
          sectionId: 'ml',
          appId: `anomaly_detection${getWizardPath(suggestion, {
            dataViewId: resolvedDataViewId,
            savedSearchId,
            projectRouting,
          })}`,
        });
      } catch (error) {
        toasts.addDanger({
          title: i18n.translate('xpack.ml.suggestADJobsFlyout.openWizardErrorTitle', {
            defaultMessage: 'Could not open the job wizard',
          }),
          text: extractErrorMessage(error),
        });
      }
    },
    [
      dataViewId,
      savedSearchId,
      projectRouting,
      indexPattern,
      dataViews,
      mlManagementLocator,
      onClose,
      toasts,
    ]
  );

  return (
    <>
      <EuiFlyoutHeader hasBorder data-test-subj="mlSuggestADJobsFlyout">
        <EuiTitle size="m">
          <h2 id="ml-flyout-layer-title">
            <FormattedMessage
              id="xpack.ml.suggestADJobsFlyout.title"
              defaultMessage="Suggested anomaly detection jobs"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.ml.suggestADJobsFlyout.subtitle"
            defaultMessage="Jobs which suit the data in {indexPattern}. Select one to review it in a job wizard."
            values={{ indexPattern: <strong>{indexPattern}</strong> }}
          />
        </EuiText>
        <EuiSpacer size="m" />
        <EuiSuperDatePicker
          compressed
          start={timeRange.from}
          end={timeRange.to}
          onTimeChange={({ start, end }) => setTimeRange({ from: start, to: end })}
          onRefresh={() => void jobSuggestionService.reload()}
          isDisabled={state.status === 'loading'}
          data-test-subj="mlSuggestADJobsTimeRange"
        />
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {state.status === 'loading' ? (
          <EuiEmptyPrompt
            data-test-subj="mlSuggestADJobsLoading"
            icon={<EuiLoadingSpinner size="xl" />}
            title={
              <h3>
                <FormattedMessage
                  id="xpack.ml.suggestADJobsFlyout.loadingTitle"
                  defaultMessage="Analyzing your data"
                />
              </h3>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.ml.suggestADJobsFlyout.loadingDescription"
                  defaultMessage="This can take up to a minute."
                />
              </p>
            }
            actions={
              <EuiButton
                size="s"
                iconType="stop"
                onClick={() => jobSuggestionService.cancel()}
                data-test-subj="mlSuggestADJobsStop"
              >
                <FormattedMessage
                  id="xpack.ml.suggestADJobsFlyout.stopButton"
                  defaultMessage="Stop"
                />
              </EuiButton>
            }
          />
        ) : state.status === 'cancelled' ? (
          <EuiEmptyPrompt
            data-test-subj="mlSuggestADJobsCancelled"
            title={
              <h3>
                <FormattedMessage
                  id="xpack.ml.suggestADJobsFlyout.cancelledTitle"
                  defaultMessage="Analysis stopped"
                />
              </h3>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.ml.suggestADJobsFlyout.cancelledDescription"
                  defaultMessage="No jobs were suggested from this run."
                />
              </p>
            }
            actions={
              <EuiButton
                size="s"
                onClick={() => void jobSuggestionService.reload()}
                data-test-subj="mlSuggestADJobsRunAgain"
              >
                <FormattedMessage
                  id="xpack.ml.suggestADJobsFlyout.runAgainButton"
                  defaultMessage="Run again"
                />
              </EuiButton>
            }
          />
        ) : state.status === 'error' ? (
          <KbnDangerCallout
            announceOnMount
            data-test-subj="mlSuggestADJobsError"
            title={i18n.translate('xpack.ml.suggestADJobsFlyout.errorTitle', {
              defaultMessage: 'Could not suggest jobs',
            })}
          >
            {extractErrorMessage(state.error)}
          </KbnDangerCallout>
        ) : state.suggestions.length === 0 ? (
          <EuiEmptyPrompt
            data-test-subj="mlSuggestADJobsEmpty"
            body={
              <p>
                <FormattedMessage
                  id="xpack.ml.suggestADJobsFlyout.emptyDescription"
                  defaultMessage="No suitable jobs were found for this data. Try a different time range."
                />
              </p>
            }
          />
        ) : (
          <SuggestionCards
            suggestions={state.suggestions}
            onSelect={openInWizard}
            testSubjPrefix="mlSuggestADJobs"
          />
        )}

        {previousRun ? <PreviousRun run={previousRun} onSelect={openInWizard} /> : null}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="mlSuggestADJobsClose">
          <FormattedMessage id="xpack.ml.suggestADJobsFlyout.closeButton" defaultMessage="Close" />
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </>
  );
};
