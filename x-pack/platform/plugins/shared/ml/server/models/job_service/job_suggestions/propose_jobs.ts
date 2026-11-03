/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedModel } from '@kbn/agent-builder-server';
import { createProposeJobsPrompt, createReviseCandidatePrompt } from './prompts';
import type { DataProfile, JobCandidate } from './schemas';
import { jobCandidateSchema, proposeJobsSchema } from './schemas';
import type { IndexEvidence } from './types';

export const proposeJobs = async ({
  model,
  evidence,
  profile,
  count,
}: {
  model: ScopedModel;
  evidence: IndexEvidence;
  profile: DataProfile;
  count: number;
}): Promise<JobCandidate[]> => {
  const { candidates } = await model.chatModel
    .withStructuredOutput(proposeJobsSchema, { name: 'propose_jobs' })
    .invoke(createProposeJobsPrompt({ evidence, profile, count }));
  return candidates;
};

/** Asks the model to fix a candidate which failed validation, given what was wrong with it. */
export const reviseCandidate = async ({
  model,
  evidence,
  candidate,
  problems,
}: {
  model: ScopedModel;
  evidence: IndexEvidence;
  candidate: JobCandidate;
  problems: string[];
}): Promise<JobCandidate> =>
  model.chatModel
    .withStructuredOutput(jobCandidateSchema, { name: 'revise_job' })
    .invoke(createReviseCandidatePrompt({ evidence, candidate, problems }));
