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
import type { MergeTemplates } from './fields';
import { getUnresolvedConflicts } from './fields';

/** A case as the preview lists it, with what the case hover card shows. */
export const toPreviewCase = (theCase: Case, templates: MergeTemplates): MergePreviewCase => ({
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
  description: theCase.description,
  createdBy: theCase.created_by,
  closedAt: theCase.closed_at,
  closedBy: theCase.closed_by,
  assignees: theCase.assignees,
  tags: theCase.tags,
  totalComments: theCase.totalComment,
  totalObservables: theCase.total_observables ?? theCase.observables?.length ?? 0,
  templateName:
    templates.enabled && theCase.template != null
      ? templates.candidates.get(theCase.template.id)?.name ?? null
      : null,
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
    const { orderedCases, destination, fields, plan, templates } = await loadMergeContext(
      request,
      clientArgs,
      casesClient
    );

    const limits = [...plan.limits, ...fields.limits];

    return decodeOrThrowZod(MergeCasesPreviewResponseSchema)({
      cases: orderedCases.map((theCase) => toPreviewCase(theCase, templates)),
      destination: { id: destination?.id ?? null, isNew: destination == null },
      fields: fields.fields,
      effectiveTemplate: fields.effectiveTemplate,
      conflicts: fields.conflicts,
      limits,
      canMerge: getUnresolvedConflicts(fields.conflicts).length === 0 && limits.length === 0,
      attachments: {
        ...plan.summaries,
        alerts: { ...plan.summaries.alerts, byRule: plan.alertsByRule },
        files: plan.files,
        comments: plan.comments,
      },
      choices: plan.choices,
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to preview merging cases [${(params.caseIds ?? []).join(', ')}]: ${error}`,
      error,
      logger,
    });
  }
};
