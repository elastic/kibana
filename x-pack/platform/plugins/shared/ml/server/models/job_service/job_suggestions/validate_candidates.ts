/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { VALIDATION_STATUS } from '@kbn/ml-validators';
import type { JobSuggestionValidationMessage } from '../../../../common/types/job_suggestions';
import type { JobValidationMessageDef, MessageId } from '../../../../common/constants/messages';
import { getMessages } from '../../../../common/constants/messages';
import type { MlClient } from '../../../lib/ml_client';
import { calculateModelMemoryLimitProvider } from '../../calculate_model_memory_limit';
import type { ValidateJobPayload } from '../../job_validation/job_validation';
import { validateJob } from '../../job_validation/job_validation';
import type { BuiltJob } from './build_job_config';
import type { IndexEvidence } from './types';

export interface CandidateCheckResult {
  /** Errors which stop the job being suggested. Written so they can be fed back to the model. */
  blockingProblems: string[];
  /** Warnings which are kept and shown alongside the suggestion. */
  warnings: JobSuggestionValidationMessage[];
  modelMemoryLimit?: string;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Runs the checks the job wizards run: the job validation, which previews the datafeed,
 * and then the model memory estimate.
 */
export const checkCandidate = async ({
  client,
  mlClient,
  built,
  evidence,
  isSecurityDisabled,
}: {
  client: IScopedClusterClient;
  mlClient: MlClient;
  built: BuiltJob;
  evidence: IndexEvidence;
  isSecurityDisabled: boolean;
}): Promise<CandidateCheckResult> => {
  const { job, datafeed } = built;
  const { start, end } = evidence.timeRange;

  const payload = {
    job: { ...job, datafeed_config: datafeed },
    duration: { start, end },
  } as ValidateJobPayload;

  let rawMessages: Awaited<ReturnType<typeof validateJob>>;
  try {
    rawMessages = await validateJob(client, mlClient, payload, isSecurityDisabled);
  } catch (error) {
    return { blockingProblems: [`Validation failed: ${errorMessage(error)}`], warnings: [] };
  }

  const definitions = getMessages();
  const messages = rawMessages.map(({ id }) => {
    const definition = definitions[id as MessageId] as JobValidationMessageDef | undefined;
    return { id, status: definition?.status ?? VALIDATION_STATUS.INFO, text: definition?.text };
  });

  const blockingProblems = messages
    .filter(({ status }) => status === VALIDATION_STATUS.ERROR)
    .map(({ id, text }) => (text ? `${id}: ${text}` : id));
  const warnings = messages
    .filter(({ status }) => status === VALIDATION_STATUS.WARNING)
    .map(({ id, status }) => ({ id, status }));

  if (blockingProblems.length > 0) {
    return { blockingProblems, warnings };
  }

  try {
    const { modelMemoryLimit } = await calculateModelMemoryLimitProvider(client, mlClient)(
      job.analysis_config,
      evidence.index,
      datafeed.query,
      evidence.timeField,
      start,
      end
    );
    return { blockingProblems: [], warnings, modelMemoryLimit };
  } catch (error) {
    return {
      blockingProblems: [`Model memory estimate failed: ${errorMessage(error)}`],
      warnings,
    };
  }
};
