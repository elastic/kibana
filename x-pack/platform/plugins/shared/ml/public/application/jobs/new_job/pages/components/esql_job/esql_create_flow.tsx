/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiFieldText, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import { KbnDangerCallout, KbnSuccessCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { JOB_ID_MAX_LENGTH } from '@kbn/ml-validators';
import { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';
import { isJobIdValid, createDatafeedId } from '../../../../../../../common/util/job_utils';
import { useNavigateToManagementMlLink } from '../../../../../contexts/kibana/use_create_url';
import { useMlApi } from '../../../../../contexts/kibana/use_ml_api_context';
import {
  buildEsqlJobPayload,
  createMeanDetectors,
} from '../../../common/job_creator/esql_job_creator';
import { useEsqlWizardContext } from './esql_wizard_context';

const NUMERIC_ESQL_TYPES = new Set([
  'byte',
  'short',
  'integer',
  'long',
  'unsigned_long',
  'float',
  'half_float',
  'scaled_float',
  'double',
]);

type CreatePhase =
  | 'idle'
  | 'creatingJob'
  | 'creatingDatafeed'
  | 'openingJob'
  | 'startingDatafeed'
  | 'success'
  | 'error';

const isValidRange = (start: string, end: string) =>
  ![start, end].some((value) => value === '' || value === '0' || value === 'MAX');

const phaseLabel: Record<Exclude<CreatePhase, 'idle' | 'success' | 'error'>, string> = {
  creatingJob: i18n.translate('xpack.ml.esqlJob.create.creatingJob', {
    defaultMessage: 'creating the job',
  }),
  creatingDatafeed: i18n.translate('xpack.ml.esqlJob.create.creatingDatafeed', {
    defaultMessage: 'creating the datafeed',
  }),
  openingJob: i18n.translate('xpack.ml.esqlJob.create.openingJob', {
    defaultMessage: 'opening the job',
  }),
  startingDatafeed: i18n.translate('xpack.ml.esqlJob.create.startingDatafeed', {
    defaultMessage: 'starting the datafeed',
  }),
};

export const EsqlCreateFlow = () => {
  const mlApi = useMlApi();
  const navigateToManagement = useNavigateToManagementMlLink('anomaly_detection');
  const { state, setJobId } = useEsqlWizardContext();
  const [phase, setPhase] = useState<CreatePhase>('idle');
  const [error, setError] = useState<string>();

  const datafeedId = createDatafeedId(state.jobId);
  const jobIdInvalid = state.jobId !== '' && !isJobIdValid(state.jobId);
  const selectedDetectorFieldsAreNumeric = state.detectorFields.every((fieldName) =>
    state.columns.some(({ name, type }) => name === fieldName && NUMERIC_ESQL_TYPES.has(type))
  );
  const emittedTimeFieldExists = state.columns.some(({ name }) => name === state.emittedTimeField);
  const isValid = useMemo(
    () =>
      isJobIdValid(state.jobId) &&
      state.jobId.length <= JOB_ID_MAX_LENGTH &&
      state.queryProbeState === 'success' &&
      state.sourceTimeField.trim() !== '' &&
      state.bucketSpan.trim() !== '' &&
      state.bucketSpan !== '0' &&
      isValidRange(state.wizardStart, state.wizardEnd) &&
      emittedTimeFieldExists &&
      state.detectorFields.length > 0 &&
      selectedDetectorFieldsAreNumeric,
    [emittedTimeFieldExists, selectedDetectorFieldsAreNumeric, state]
  );
  const isSubmitting = !['idle', 'error'].includes(phase);

  const create = useCallback(async () => {
    if (!isValid || isSubmitting) return;

    const jobId = state.jobId;
    const nextDatafeedId = createDatafeedId(jobId);
    const { job, datafeed } = buildEsqlJobPayload({
      jobId,
      datafeedId: nextDatafeedId,
      query: state.query,
      sourceTimeField: state.sourceTimeField,
      timeField: state.emittedTimeField,
      bucketSpan: state.bucketSpan,
      detectors: createMeanDetectors(state.detectorFields),
      influencers: state.influencers,
    });

    let currentPhase: Exclude<CreatePhase, 'idle' | 'success' | 'error'> = 'creatingJob';
    setError(undefined);
    try {
      setPhase(currentPhase);
      await mlApi.addJob({ jobId, job });
      currentPhase = 'creatingDatafeed';
      setPhase(currentPhase);
      await mlApi.addDatafeed({ datafeedId: nextDatafeedId, datafeedConfig: datafeed });
      currentPhase = 'openingJob';
      setPhase(currentPhase);
      await mlApi.openJob({ jobId });
      currentPhase = 'startingDatafeed';
      setPhase(currentPhase);
      await mlApi.startDatafeed({
        datafeedId: nextDatafeedId,
        start: state.wizardStart,
        end: state.wizardEnd,
      });
      setPhase('success');
      await navigateToManagement(ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE, { jobId });
    } catch (nextError: unknown) {
      const failedPhase = phaseLabel[currentPhase];
      const reason = nextError instanceof Error ? nextError.message : String(nextError);
      setError(
        i18n.translate('xpack.ml.esqlJob.create.failureMessage', {
          defaultMessage:
            'Unable to complete ES|QL job setup while {failedPhase} (job: {jobId}, datafeed: {datafeedId}, window: {start} to {end}): {reason}',
          values: {
            failedPhase,
            jobId,
            datafeedId: nextDatafeedId,
            start: state.wizardStart,
            end: state.wizardEnd,
            reason,
          },
        })
      );
      setPhase('error');
    }
  }, [isSubmitting, isValid, mlApi, navigateToManagement, state]);

  return (
    <section data-test-subj="mlEsqlCreateFlow">
      <EuiSpacer size="l" />
      <EuiFormRow
        label={i18n.translate('xpack.ml.esqlJob.create.jobIdLabel', {
          defaultMessage: 'Job ID',
        })}
        isInvalid={jobIdInvalid}
        error={i18n.translate('xpack.ml.esqlJob.create.invalidJobId', {
          defaultMessage:
            'Use lowercase letters, numbers, hyphens, and underscores; begin and end with a letter or number.',
        })}
        fullWidth
      >
        <EuiFieldText
          aria-label={i18n.translate('xpack.ml.esqlJob.create.jobIdLabel', {
            defaultMessage: 'Job ID',
          })}
          value={state.jobId}
          onChange={(event) => setJobId(event.target.value)}
          maxLength={JOB_ID_MAX_LENGTH}
          isInvalid={jobIdInvalid}
          data-test-subj="mlEsqlJobId"
          fullWidth
          disabled={isSubmitting}
        />
      </EuiFormRow>
      <EuiText size="s" color="subdued">
        <p data-test-subj="mlEsqlDatafeedId">
          {i18n.translate('xpack.ml.esqlJob.create.datafeedId', {
            defaultMessage: 'Datafeed ID: {datafeedId}',
            values: { datafeedId },
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiButton
        fill
        onClick={create}
        isLoading={isSubmitting}
        isDisabled={!isValid || isSubmitting}
        data-test-subj="mlEsqlCreateJobButton"
      >
        {i18n.translate('xpack.ml.esqlJob.create.buttonLabel', {
          defaultMessage: 'Create job and start datafeed',
        })}
      </EuiButton>
      {error !== undefined ? (
        <KbnDangerCallout
          title={i18n.translate('xpack.ml.esqlJob.create.failureTitle', {
            defaultMessage: 'Unable to create and start ES|QL job',
          })}
          announceOnMount
          text={<p>{error}</p>}
        />
      ) : null}
      {phase === 'success' ? (
        <KbnSuccessCallout
          title={i18n.translate('xpack.ml.esqlJob.create.successTitle', {
            defaultMessage: 'ES|QL job created and datafeed started',
          })}
          announceOnMount
          text={
            <p>
              {i18n.translate('xpack.ml.esqlJob.create.successMessage', {
                defaultMessage: 'Job {jobId} and datafeed {datafeedId} are running.',
                values: { jobId: state.jobId, datafeedId },
              })}
            </p>
          }
        />
      ) : null}
    </section>
  );
};
