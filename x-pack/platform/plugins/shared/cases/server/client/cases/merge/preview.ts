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
import { createCaseError } from '../../../common/error';
import { decodeOrThrowZod, decodeWithExcessOrThrowZod } from '../../../common/runtime_types';
import type { CasesClient } from '../../client';
import type { CasesClientArgs } from '../../types';
import { loadMergeContext } from './context';
import { getUnresolvedConflicts } from './fields';

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
  template: theCase.template ?? null,
  merge: theCase.merge ?? null,
});

/**
 * A dry run of the merge: the suggested value of every field, the conflicts and limits that would
 * refuse the merge, and what each kind of attachment would copy. It takes the same choices as the
 * merge, so the caller sees exactly what the merge would do with them. Writes nothing.
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
      clientArgs,
      casesClient
    );

    const limits = [...plan.limits, ...fields.limits];
    const isOverLimit = plan.limits.length > 0;

    return decodeOrThrowZod(MergeCasesPreviewResponseSchema)({
      cases: orderedCases.map(toPreviewCase),
      destination: { id: destination?.id ?? null, isNew: destination == null },
      fields: fields.fields,
      effectiveTemplate: fields.effectiveTemplate,
      conflicts: fields.conflicts,
      limits,
      canMerge: getUnresolvedConflicts(fields.conflicts).length === 0 && limits.length === 0,
      attachments: {
        ...plan.summaries,
        alerts: { ...plan.summaries.alerts, byRule: plan.alertsByRule },
        files: { total: plan.files },
        comments: { total: plan.comments },
      },
      // Once the user has chosen, the choices stay available so they can change their mind.
      choices: isOverLimit || request.attachments != null ? plan.choices : null,
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to preview merging cases [${(params.caseIds ?? []).join(', ')}]: ${error}`,
      error,
      logger,
    });
  }
};
