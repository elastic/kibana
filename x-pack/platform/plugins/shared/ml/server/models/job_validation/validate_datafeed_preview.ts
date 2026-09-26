/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import type { DatafeedValidationResponse } from '@kbn/ml-common-types/job_validation';
import type { MlClient } from '../../lib/ml_client';
import type { JobValidationMessage } from '../../../common/constants/messages';

export async function validateDatafeedPreviewWithMessages(
  mlClient: MlClient,
  job: CombinedJob,
  start: number | undefined,
  end: number | undefined
): Promise<JobValidationMessage[]> {
  const { valid, documentsFound } = await validateDatafeedPreview(mlClient, job, start, end);
  if (valid) {
    return documentsFound ? [] : [{ id: 'datafeed_preview_no_documents' }];
  }
  return [{ id: 'datafeed_preview_failed' }];
}

export interface DatafeedPreviewSample extends DatafeedValidationResponse {
  /** Documents from the single preview call. Empty when the preview failed. */
  documents: unknown[];
}

/**
 * Runs one datafeed preview and returns both the validation result and the
 * sampled documents. Callers that only need validity should use
 * {@link validateDatafeedPreview}, which does not include source documents.
 */
export async function previewDatafeedForValidation(
  mlClient: MlClient,
  job: CombinedJob,
  start: number | undefined,
  end: number | undefined
): Promise<DatafeedPreviewSample> {
  const { datafeed_config: datafeed, ...tempJob } = job;
  try {
    const preview = (await mlClient.previewDatafeed(
      {
        job_config: tempJob,
        datafeed_config: datafeed,
        start,
        end,
      },
      { maxRetries: 0 }
    )) as unknown;
    const documents = extractPreviewDocuments(preview);
    return {
      valid: true,
      documentsFound: documents.length > 0,
      documents,
    };
  } catch (error) {
    return {
      valid: false,
      documentsFound: false,
      documents: [],
      error: error.body ?? error,
    };
  }
}

export async function validateDatafeedPreview(
  mlClient: MlClient,
  job: CombinedJob,
  start: number | undefined,
  end: number | undefined
): Promise<DatafeedValidationResponse> {
  const { datafeed_config: datafeed, ...tempJob } = job;
  try {
    const body = (await mlClient.previewDatafeed(
      {
        job_config: tempJob,
        datafeed_config: datafeed,
        start,
        end,
      },
      { maxRetries: 0 }
      // previewDatafeed response type is incorrect
    )) as unknown as { body: unknown[] };

    return {
      valid: true,
      documentsFound: Array.isArray(body) && body.length > 0,
    };
  } catch (error) {
    return {
      valid: false,
      documentsFound: false,
      error: error.body ?? error,
    };
  }
}

/** Accepts both `{ body: unknown[] }` and a bare document array. */
const extractPreviewDocuments = (preview: unknown): unknown[] => {
  if (Array.isArray(preview)) {
    return preview;
  }
  if (preview === null || typeof preview !== 'object' || !('body' in preview)) {
    return [];
  }
  const { body } = preview;
  return Array.isArray(body) ? body : [];
};
