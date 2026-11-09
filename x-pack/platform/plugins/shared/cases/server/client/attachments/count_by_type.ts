/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import { createCaseError } from '../../common/error';

export const MAX_CASES_PER_ATTACHMENT_COUNT = 100;

export interface CountAttachmentsByTypeArgs {
  caseIds: string[];
  attachmentType: string;
}

/**
 * Counts one unified attachment type on each case the caller can see. Cases the caller can't read
 * (including restricted cases they aren't assigned to) are left out of the result.
 */
export const countAttachmentsByType = async (
  { caseIds, attachmentType }: CountAttachmentsByTypeArgs,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<Record<string, number>> => {
  if (caseIds.length > MAX_CASES_PER_ATTACHMENT_COUNT) {
    throw Boom.badRequest(
      `Attachments can be counted on up to ${MAX_CASES_PER_ATTACHMENT_COUNT} cases at a time.`
    );
  }

  try {
    const uniqueIds = [...new Set(caseIds)];
    if (uniqueIds.length === 0) {
      return {};
    }

    const { cases } = await casesClient.cases.bulkGet({ ids: uniqueIds });
    const visibleIds = cases.map(({ id }) => id);
    const counts =
      await clientArgs.services.attachmentService.getter.getUnifiedAttachmentCountsByType({
        caseIds: visibleIds,
        attachmentType,
      });

    return Object.fromEntries(visibleIds.map((id) => [id, counts.get(id) ?? 0]));
  } catch (error) {
    throw createCaseError({
      message: `Failed to count ${attachmentType} attachments: ${error}`,
      error,
      logger: clientArgs.logger,
    });
  }
};
