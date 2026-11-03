/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type {
  JobSuggestion,
  JobSuggestionValidationMessage,
} from '../../../../common/types/job_suggestions';
import { mlLog } from '../../../lib/log';
import type { MlClient } from '../../../lib/ml_client';
import { buildJobAndDatafeed, findCandidateProblems, generateJobId } from './build_job_config';
import {
  DEFAULT_MAX_SUGGESTIONS,
  DEFAULT_TIME_RANGE_MS,
  EXTRA_CANDIDATES,
  MAX_REVISION_ATTEMPTS,
} from './constants';
import { gatherEvidence } from './gather_evidence';
import { interpretData } from './interpret_data';
import { proposeJobs, reviseCandidate } from './propose_jobs';
import type { JobCandidate } from './schemas';
import type { IndexEvidence, RecognizerModuleHit } from './types';
import { checkCandidate } from './validate_candidates';

export interface SuggestJobsDeps {
  client: IScopedClusterClient;
  mlClient: MlClient;
  model: ScopedModel;
  isSecurityDisabled: boolean;
  findRecognizerMatches?: (index: string) => Promise<RecognizerModuleHit[]>;
}

export interface SuggestJobsParams {
  index: string;
  start?: number;
  end?: number;
  maxSuggestions?: number;
}

type SuggestionDraft = Omit<JobSuggestion, 'id'>;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const detectorSignature = (candidate: JobCandidate): string =>
  candidate.detectors
    .map(
      ({
        function: fn,
        field_name: field,
        by_field_name: by,
        over_field_name: over,
        partition_field_name: part,
      }) => [fn, field, by, over, part].join('|')
    )
    .sort()
    .join(';');

/**
 * Takes a candidate through validation. A candidate which fails is sent back to the model with
 * the problems found, a limited number of times, and dropped if it still fails.
 */
const resolveCandidate = async ({
  candidate: initialCandidate,
  evidence,
  deps,
}: {
  candidate: JobCandidate;
  evidence: IndexEvidence;
  deps: SuggestJobsDeps;
}): Promise<{ draft: SuggestionDraft; candidate: JobCandidate } | undefined> => {
  const { client, mlClient, model, isSecurityDisabled } = deps;
  let candidate = initialCandidate;

  for (let attempt = 0; attempt <= MAX_REVISION_ATTEMPTS; attempt++) {
    let problems = findCandidateProblems(candidate, evidence);

    if (problems.length === 0) {
      const built = buildJobAndDatafeed({
        candidate,
        evidence,
        jobId: generateJobId(candidate.title),
      });
      const check = await checkCandidate({ client, mlClient, built, evidence, isSecurityDisabled });
      problems = check.blockingProblems;

      if (problems.length === 0) {
        const warnings: JobSuggestionValidationMessage[] = check.warnings;
        const job = check.modelMemoryLimit
          ? {
              ...built.job,
              analysis_limits: {
                ...built.job.analysis_limits,
                model_memory_limit: check.modelMemoryLimit,
              },
            }
          : built.job;
        return {
          candidate,
          draft: {
            title: candidate.title,
            description: candidate.description,
            jobType: built.jobType,
            job,
            datafeed: built.datafeed,
            ...(check.modelMemoryLimit
              ? { estimatedModelMemoryLimit: check.modelMemoryLimit }
              : {}),
            validation: { status: warnings.length > 0 ? 'warning' : 'valid', messages: warnings },
          },
        };
      }
    }

    if (attempt === MAX_REVISION_ATTEMPTS) {
      mlLog.debug(`Dropped suggested job "${candidate.title}": ${problems.join(' ')}`);
      return undefined;
    }

    try {
      candidate = await reviseCandidate({ model, evidence, candidate, problems });
    } catch (error) {
      mlLog.debug(`Could not revise suggested job "${candidate.title}": ${errorMessage(error)}`);
      return undefined;
    }
  }

  return undefined;
};

/**
 * Looks at an index and proposes anomaly detection jobs which suit its data.
 *
 * 1. Gather facts about the index.
 * 2. Ask the model what the data represents.
 * 3. Ask the model for jobs.
 * 4. Validate every job, sending failures back to the model to fix.
 */
export const suggestJobs = async (
  deps: SuggestJobsDeps,
  { index, start, end, maxSuggestions = DEFAULT_MAX_SUGGESTIONS }: SuggestJobsParams
): Promise<JobSuggestion[]> => {
  const rangeEnd = end ?? Date.now();
  const rangeStart = start ?? rangeEnd - DEFAULT_TIME_RANGE_MS;
  if (rangeStart >= rangeEnd) {
    throw Boom.badRequest('The start of the time range must be before the end.');
  }

  const { client, model, findRecognizerMatches } = deps;

  const evidence = await gatherEvidence({
    client,
    index,
    start: rangeStart,
    end: rangeEnd,
    findRecognizerMatches,
  });

  const profile = await interpretData({ model, evidence });
  const candidates = await proposeJobs({
    model,
    evidence,
    profile,
    count: maxSuggestions + EXTRA_CANDIDATES,
  });

  const resolved = await Promise.all(
    candidates.map((candidate) => resolveCandidate({ candidate, evidence, deps }))
  );

  const seen = new Set<string>();
  const drafts = resolved.flatMap((result) => {
    if (result === undefined) return [];
    const signature = detectorSignature(result.candidate);
    if (seen.has(signature)) return [];
    seen.add(signature);
    return [result.draft];
  });

  // Suggestions without warnings come first. The sort is stable, so the model's order is kept otherwise.
  return drafts
    .sort((a, b) => a.validation.messages.length - b.validation.messages.length)
    .slice(0, maxSuggestions)
    .map((draft, i) => ({ id: `suggestion-${i + 1}`, ...draft }));
};
