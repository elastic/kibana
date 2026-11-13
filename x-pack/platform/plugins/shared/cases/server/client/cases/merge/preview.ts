/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MergeCasesPreviewRequest,
  MergeCasesPreviewResponse,
  MergePreviewCase,
} from '../../../../common/types/api';
import {
  MergeCasesPreviewRequestSchema,
  MergeCasesPreviewResponseSchema,
} from '../../../../common/types/api';
import type { Case } from '../../../../common/types/domain';
import { decodeOrThrowZod, decodeWithExcessOrThrowZod } from '../../../common/runtime_types';
import { createCaseError } from '../../../common/error';
import type { CasesClient } from '../../client';
import type { CasesClientArgs } from '../../types';
import { loadMergeContext } from './context';

const toPreviewCase = (theCase: Case): MergePreviewCase => ({
  id: theCase.id,
  version: theCase.version,
  title: theCase.title,
  incrementalId: theCase.incremental_id ?? null,
  status: theCase.status,
  severity: theCase.severity,
  owner: theCase.owner,
  createdAt: theCase.created_at,
  totalAlerts: theCase.totalAlerts,
  mergedInto: theCase.merged_into ?? null,
});

/**
 * Computes what merging the cases would produce: field defaults and conflicts, the attachments
 * that would be copied, and whether any limit is exceeded. Nothing is written.
 */
export const mergePreview = async (
  params: MergeCasesPreviewRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<MergeCasesPreviewResponse> => {
  const { logger } = clientArgs;

  try {
    const request = decodeWithExcessOrThrowZod(MergeCasesPreviewRequestSchema)(params);
    const { orderedCases, destination, fields, plan } = await loadMergeContext(
      request,
      casesClient
    );

    return decodeOrThrowZod(MergeCasesPreviewResponseSchema)({
      cases: orderedCases.map(toPreviewCase),
      destinationCaseId: destination?.id ?? null,
      fields,
      attachments: {
        ...plan.summaries,
        files: { total: plan.files },
        comments: { total: plan.comments },
      },
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to preview merging cases [${(params.caseIds ?? []).join(', ')}]: ${error}`,
      error,
      logger,
    });
  }
};
