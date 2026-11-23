/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timeoutSignal } from '@kbn/std';
import Boom from '@hapi/boom';
import type { CaseDeltaSummaryResponse } from '../../../common/types/api';
import { CaseDeltaSummaryResponseSchema } from '../../../common/types/api';
import { createCaseError } from '../../common/error';
import { decodeOrThrowZod } from '../../common/runtime_types';
import {
  buildDeltaPrompt,
  parseDeltaSummary,
  SUMMARY_SYSTEM_PROMPT,
} from '../../services/delta_summary/prompt';
import type { CasesClientArgs } from '../types';
import type { CasesClient } from '../client';
import { getDelta } from './delta';
import type { UserActionGet } from './types';

const SUMMARY_TIMEOUT_MS = 30_000;

export const summarizeCaseDelta = async (
  { caseId }: UserActionGet,
  casesClient: CasesClient,
  clientArgs: CasesClientArgs
): Promise<CaseDeltaSummaryResponse> => {
  const { deltaSummarizer, logger } = clientArgs;

  try {
    if (deltaSummarizer == null) {
      throw Boom.failedDependency('The AI summary is not available');
    }

    const delta = await getDelta({ caseId }, casesClient, clientArgs);

    if (delta.items.length === 0) {
      return decodeOrThrowZod(CaseDeltaSummaryResponseSchema)({ summary: '', sources: [] });
    }

    if (!delta.aiSummaryAvailable) {
      throw Boom.failedDependency('No AI model is available');
    }

    const total = Object.values(delta.counts).reduce((sum, count) => sum + count, 0);
    const prompt = buildDeltaPrompt(delta.items, total);
    const deadline = timeoutSignal(SUMMARY_TIMEOUT_MS);
    try {
      const text = await deltaSummarizer.complete({
        system: SUMMARY_SYSTEM_PROMPT,
        user: prompt.user,
        abortSignal: deadline,
      });

      return decodeOrThrowZod(CaseDeltaSummaryResponseSchema)(
        parseDeltaSummary(text, prompt.items)
      );
    } finally {
      deadline.dispose();
    }
  } catch (error) {
    throw createCaseError({
      message: `Failed to summarize the delta for case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};
