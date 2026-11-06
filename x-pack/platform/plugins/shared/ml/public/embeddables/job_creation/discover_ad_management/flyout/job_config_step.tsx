/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import moment from 'moment';
import type { estypes } from '@elastic/elasticsearch';
import {
  EuiButton,
  EuiButtonGroup,
  EuiCheckbox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiProgress,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiText,
  useEuiTheme,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import { KbnDangerCallout, KbnSuccessCallout } from '@kbn/ui-callout';
import { JOB_ID_MAX_LENGTH } from '@kbn/ml-validators';
import type { JobSuggestion } from '../../../../../common/types/job_suggestions';
import { basicJobValidation } from '../../../../../common/util/job_utils';
import type { CreateState } from '../../../../application/jobs/new_job/job_from_dashboard';
import type {
  QuickSuggestedJobCreator,
  TimeRangeMs,
} from '../../../../application/jobs/new_job/job_from_suggestion';
import { useMlApi, useMlKibana } from '../../../../application/contexts/kibana';
import {
  setSelectedJobId,
  setShowAnomalies,
} from '../../../../application/components/job_suggestion/selected_job';
import { SuggestionBadges } from '../../../../application/components/job_suggestion/suggestion_badges';

type TimeRangeMode = 'all' | 'custom';

type FullTimeRange =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; range: TimeRangeMs };

interface CustomTimeRange {
  from: string;
  to: string;
}

const DEFAULT_CUSTOM_TIME_RANGE: CustomTimeRange = { from: 'now-30d', to: 'now' };

type CreateStatus =
  | { status: 'idle' }
  | { status: 'creating' }
  | { status: 'failed'; message: string }
  | { status: 'created'; timeRange: TimeRangeMs; runInRealTime: boolean };

const getFailureMessage = ({
  jobCreated,
  datafeedCreated,
  jobOpened,
  datafeedStarted,
}: CreateState): string | undefined => {
  if (!jobCreated.success) {
    return i18n.translate('xpack.ml.discoverADManagement.jobNotCreatedError', {
      defaultMessage: 'The job could not be created: {error}',
      values: { error: extractErrorMessage(jobCreated.error) },
    });
  }
  if (!datafeedCreated.success) {
    return i18n.translate('xpack.ml.discoverADManagement.datafeedNotCreatedError', {
      defaultMessage: 'The job was created, but its datafeed could not be: {error}',
      values: { error: extractErrorMessage(datafeedCreated.error) },
    });
  }
  if (!jobOpened.success) {
    return i18n.translate('xpack.ml.discoverADManagement.jobNotOpenedError', {
      defaultMessage: 'The job was created, but it could not be opened: {error}',
      values: { error: extractErrorMessage(jobOpened.error) },
    });
  }
  if (!datafeedStarted.success) {
    return i18n.translate('xpack.ml.discoverADManagement.datafeedNotStartedError', {
      defaultMessage: 'The job was created, but its datafeed could not be started: {error}',
      values: { error: extractErrorMessage(datafeedStarted.error) },
    });
  }
};

const formatTime = (time: number) => moment(time).format('lll');

interface Props {
  suggestion: JobSuggestion;
  /** The index pattern of the Discover chart which the results of the job can be added to. */
  indexPattern: string;
  creator: QuickSuggestedJobCreator;
  onClose: () => void;
}

/**
 * Lets the user name the job of a suggestion and choose the data it analyzes,
 * then creates the job and starts it.
 */
export const JobConfigStep: FC<Props> = ({ suggestion, indexPattern, creator, onClose }) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: {
      data: {
        query: {
          timefilter: { timefilter },
        },
      },
    },
  } = useMlKibana();
  const mlApi = useMlApi();

  const [jobId, setJobId] = useState(suggestion.job.job_id);
  const [jobIdError, setJobIdError] = useState<string>();
  // the suggested job id is checked as soon as the step opens
  const [isValidatingJobId, setIsValidatingJobId] = useState(true);
  const [timeRangeMode, setTimeRangeMode] = useState<TimeRangeMode>('all');
  const [customTimeRange, setCustomTimeRange] = useState(DEFAULT_CUSTOM_TIME_RANGE);
  const [runInRealTime, setRunInRealTime] = useState(true);
  const [fullTimeRange, setFullTimeRange] = useState<FullTimeRange>({ status: 'loading' });
  const [createStatus, setCreateStatus] = useState<CreateStatus>({ status: 'idle' });
  // how much of the data the started job has analyzed, as a percentage
  const [progress, setProgress] = useState<number>();

  useEffect(() => {
    let cancelled = false;
    creator
      .getFullTimeRange(suggestion)
      .then((range) => {
        if (cancelled) return;
        setFullTimeRange(
          Number.isFinite(range.start) && Number.isFinite(range.end) && range.start <= range.end
            ? { status: 'loaded', range }
            : {
                status: 'error',
                message: i18n.translate('xpack.ml.discoverADManagement.noDataError', {
                  defaultMessage: 'No data was found to analyze.',
                }),
              }
        );
      })
      .catch((error) => {
        if (cancelled) return;
        setFullTimeRange({ status: 'error', message: extractErrorMessage(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [creator, suggestion]);

  useDebounce(
    () => {
      const validationResults = basicJobValidation(
        { job_id: jobId, analysis_config: { detectors: [] } } as unknown as estypes.MlJob,
        undefined,
        { max_model_memory_limit: '', effective_max_model_memory_limit: '' },
        true
      );
      if (jobId === '') {
        setJobIdError(
          i18n.translate('xpack.ml.discoverADManagement.jobIdRequiredError', {
            defaultMessage: 'Enter a job ID.',
          })
        );
        setIsValidatingJobId(false);
      } else if (validationResults.contains('job_id_invalid')) {
        setJobIdError(
          i18n.translate('xpack.ml.newJob.wizard.validateJob.jobNameAllowedCharactersDescription', {
            defaultMessage:
              'Job ID can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; ' +
              'must start and end with an alphanumeric character',
          })
        );
        setIsValidatingJobId(false);
      } else if (validationResults.contains('job_id_invalid_max_length')) {
        setJobIdError(
          i18n.translate('xpack.ml.newJob.wizard.validateJob.jobIdInvalidMaxLengthErrorMessage', {
            defaultMessage:
              'Job ID must be no more than {maxLength, plural, one {# character} other {# characters}} long.',
            values: { maxLength: JOB_ID_MAX_LENGTH },
          })
        );
        setIsValidatingJobId(false);
      } else {
        mlApi.jobs
          .jobsExist([jobId])
          .then((response) => {
            setJobIdError(
              response[jobId]?.exists
                ? i18n.translate('xpack.ml.newJob.wizard.validateJob.jobNameAlreadyExists', {
                    defaultMessage:
                      'Job ID already exists. A job ID cannot be the same as an existing job or group.',
                  })
                : undefined
            );
          })
          .catch(() => setJobIdError(undefined))
          .finally(() => setIsValidatingJobId(false));
      }
    },
    500,
    [jobId, mlApi]
  );

  const customRange = useMemo<TimeRangeMs | undefined>(() => {
    const { min, max } = timefilter.calculateBounds(customTimeRange);
    const start = min?.valueOf();
    const end = max?.valueOf();
    return start !== undefined && end !== undefined && start < end ? { start, end } : undefined;
  }, [timefilter, customTimeRange]);

  const timeRange =
    timeRangeMode === 'all'
      ? fullTimeRange.status === 'loaded'
        ? fullTimeRange.range
        : undefined
      : customRange;

  const canCreate =
    timeRange !== undefined &&
    jobIdError === undefined &&
    !isValidatingJobId &&
    createStatus.status !== 'creating';

  useEffect(() => {
    if (createStatus.status !== 'created') return;
    setProgress(0);
    const subscription = creator
      .watchProgress({
        jobId,
        timeRange: createStatus.timeRange,
        runInRealTime: createStatus.runInRealTime,
      })
      .subscribe({
        next: setProgress,
        // the job has been started, so it is only the progress which is not shown
        error: () => setProgress(undefined),
      });
    return () => subscription.unsubscribe();
  }, [creator, createStatus, jobId]);

  const createJob = useCallback(async () => {
    if (timeRange === undefined) return;
    setCreateStatus({ status: 'creating' });
    try {
      const isRealTime = timeRangeMode === 'all' && runInRealTime;
      const result = await creator.createAndSaveJob({
        suggestion,
        jobId,
        timeRange,
        startJob: true,
        runInRealTime: isRealTime,
      });
      const message = getFailureMessage(result);
      setCreateStatus(
        message
          ? { status: 'failed', message }
          : { status: 'created', timeRange, runInRealTime: isRealTime }
      );
    } catch (error) {
      setCreateStatus({ status: 'failed', message: extractErrorMessage(error) });
    }
  }, [creator, suggestion, jobId, timeRange, timeRangeMode, runInRealTime]);

  // The results of the job are then shown on the Discover chart
  const addResultsToChart = useCallback(() => {
    setSelectedJobId(indexPattern, jobId);
    setShowAnomalies(indexPattern, true);
    onClose();
  }, [indexPattern, jobId, onClose]);

  const timeRangeOptions = useMemo(
    () => [
      {
        id: 'all',
        label: i18n.translate('xpack.ml.discoverADManagement.allTimeLabel', {
          defaultMessage: 'Over all time',
        }),
        'data-test-subj': 'mlDiscoverADManagementAllTime',
      },
      {
        id: 'custom',
        label: i18n.translate('xpack.ml.discoverADManagement.customRangeLabel', {
          defaultMessage: 'Custom range',
        }),
        'data-test-subj': 'mlDiscoverADManagementCustomRange',
      },
    ],
    []
  );

  return (
    <div css={{ padding: euiTheme.size.base }} data-test-subj="mlDiscoverADManagementConfig">
      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.ml.discoverADManagement.createNewJobTitle', {
            defaultMessage: 'Create new job',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText size="s">
        <p>{suggestion.description}</p>
      </EuiText>
      <EuiSpacer size="s" />
      <SuggestionBadges suggestion={suggestion} />
      <EuiSpacer size="l" />

      {createStatus.status === 'created' ? (
        <>
          <KbnSuccessCallout
            announceOnMount
            title={i18n.translate('xpack.ml.discoverADManagement.createdTitle', {
              defaultMessage: 'The job was created and started',
            })}
            text={
              <p>
                <FormattedMessage
                  id="xpack.ml.discoverADManagement.createdDescription"
                  defaultMessage="{jobId} is analyzing the data from {start} to {end}."
                  values={{
                    jobId: <strong>{jobId}</strong>,
                    start: formatTime(createStatus.timeRange.start),
                    end: formatTime(createStatus.timeRange.end),
                  }}
                />
              </p>
            }
            data-test-subj="mlDiscoverADManagementCreated"
          />
          {progress !== undefined && (
            <>
              <EuiSpacer size="m" />
              <EuiProgress
                size="m"
                value={progress}
                max={100}
                label={
                  progress < 100
                    ? i18n.translate('xpack.ml.discoverADManagement.progressLabel', {
                        defaultMessage: 'Analyzing the data',
                      })
                    : i18n.translate('xpack.ml.discoverADManagement.progressCompleteLabel', {
                        defaultMessage: 'Finished analyzing the data',
                      })
                }
                valueText
                data-test-subj="mlDiscoverADManagementProgress"
              />
            </>
          )}
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={addResultsToChart}
                data-test-subj="mlDiscoverADManagementAddResultsToChart"
              >
                <FormattedMessage
                  id="xpack.ml.discoverADManagement.addResultsToChartButton"
                  defaultMessage="Add results to chart"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : (
        <>
          <EuiFormRow
            label={i18n.translate('xpack.ml.discoverADManagement.jobIdLabel', {
              defaultMessage: 'Job ID',
            })}
            error={jobIdError}
            isInvalid={jobIdError !== undefined}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              value={jobId}
              isInvalid={jobIdError !== undefined}
              isLoading={isValidatingJobId}
              disabled={createStatus.status === 'creating'}
              onChange={(event) => {
                setJobId(event.target.value);
                setIsValidatingJobId(true);
              }}
              data-test-subj="mlDiscoverADManagementJobId"
            />
          </EuiFormRow>
          <EuiSpacer size="m" />

          <EuiFormRow
            label={i18n.translate('xpack.ml.discoverADManagement.timeRangeLabel', {
              defaultMessage: 'Data to analyze',
            })}
            fullWidth
          >
            <EuiButtonGroup
              legend={i18n.translate('xpack.ml.discoverADManagement.timeRangeLegend', {
                defaultMessage: 'Data to analyze',
              })}
              buttonSize="compressed"
              isFullWidth
              options={timeRangeOptions}
              idSelected={timeRangeMode}
              isDisabled={createStatus.status === 'creating'}
              onChange={(id) => setTimeRangeMode(id as TimeRangeMode)}
            />
          </EuiFormRow>
          <EuiSpacer size="s" />

          {timeRangeMode === 'all' ? (
            <>
              <EuiText size="s" color="subdued" data-test-subj="mlDiscoverADManagementFullRange">
                {fullTimeRange.status === 'loading' ? (
                  <EuiLoadingSpinner size="s" />
                ) : fullTimeRange.status === 'error' ? (
                  fullTimeRange.message
                ) : (
                  <FormattedMessage
                    id="xpack.ml.discoverADManagement.fullRangeDescription"
                    defaultMessage="All of the data in the index: {start} to {end}."
                    values={{
                      start: formatTime(fullTimeRange.range.start),
                      end: formatTime(fullTimeRange.range.end),
                    }}
                  />
                )}
              </EuiText>
              <EuiSpacer size="m" />
              <EuiCheckbox
                id="mlDiscoverADManagementRealTime"
                checked={runInRealTime}
                disabled={createStatus.status === 'creating'}
                onChange={(event) => setRunInRealTime(event.target.checked)}
                label={i18n.translate('xpack.ml.discoverADManagement.realTimeLabel', {
                  defaultMessage: 'Leave the job running for new data',
                })}
                data-test-subj="mlDiscoverADManagementRealTime"
              />
            </>
          ) : (
            <>
              <EuiSuperDatePicker
                compressed
                showUpdateButton={false}
                start={customTimeRange.from}
                end={customTimeRange.to}
                isDisabled={createStatus.status === 'creating'}
                onTimeChange={({ start, end }) => setCustomTimeRange({ from: start, to: end })}
                data-test-subj="mlDiscoverADManagementTimeRange"
              />
              {customRange === undefined ? (
                <>
                  <EuiSpacer size="s" />
                  <EuiText size="s" color="danger">
                    <FormattedMessage
                      id="xpack.ml.discoverADManagement.invalidTimeRangeError"
                      defaultMessage="The time range is not valid."
                    />
                  </EuiText>
                </>
              ) : null}
            </>
          )}

          {createStatus.status === 'failed' ? (
            <>
              <EuiSpacer size="m" />
              <KbnDangerCallout
                announceOnMount
                title={i18n.translate('xpack.ml.discoverADManagement.failedTitle', {
                  defaultMessage: 'Could not create the job',
                })}
                data-test-subj="mlDiscoverADManagementFailed"
              >
                {createStatus.message}
              </KbnDangerCallout>
            </>
          ) : null}

          <EuiSpacer size="l" />
          <EuiButton
            fill
            iconType="play"
            isLoading={createStatus.status === 'creating'}
            isDisabled={!canCreate}
            onClick={createJob}
            data-test-subj="mlDiscoverADManagementCreate"
          >
            <FormattedMessage
              id="xpack.ml.discoverADManagement.createButton"
              defaultMessage="Create job"
            />
          </EuiButton>
        </>
      )}
    </div>
  );
};
