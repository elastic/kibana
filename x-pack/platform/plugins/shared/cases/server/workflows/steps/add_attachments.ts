/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  buildAddAttachmentsStepCommonDefinition,
  type AddAttachmentsStepInput,
} from '../../../common/workflows/steps/add_attachments';
import type { BulkCreateAttachmentsRequestV2 } from '../../../common/types/api';
import type { UnifiedAttachmentTypeRegistry } from '../../attachment_framework/unified_attachment_registry';
import type { CasesClient } from '../../client';
import { createCasesStepHandler, safeParseCaseForWorkflowOutput, withCaseOwner } from './utils';
import { selectAuthorableAttachmentSchemas } from './unified_attachment_schemas';

/**
 * Builds the `cases.addAttachments` server step definition, or returns
 * `undefined` when no authorable attachment type is registered — which the
 * step registry treats as a silently skipped registration.
 *
 * Must be invoked from a deferred loader (async import) at `setup` so the
 * registry has been populated by solution plugins whose `setup` runs after
 * cases's. Composing the union eagerly at cases `setup` would snapshot only
 * the built-in types (see PR #269993 review).
 */
export const addAttachmentsStepDefinition = (
  unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry,
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) => {
  const members = selectAuthorableAttachmentSchemas(unifiedAttachmentTypeRegistry);
  if (members.length === 0) {
    return undefined;
  }

  const definition = buildAddAttachmentsStepCommonDefinition(members);

  return createServerStepDefinition({
    ...definition,
    handler: createCasesStepHandler(
      getCasesClient,
      async (client, input: AddAttachmentsStepInput) => {
        return withCaseOwner(client, input.case_id, async (owner) => {
          const attachments = input.attachments.map((attachment) => ({
            ...(attachment as Record<string, unknown>),
            owner,
          })) as BulkCreateAttachmentsRequestV2;

          const updatedCase = await client.attachments.bulkCreate({
            caseId: input.case_id,
            attachments,
          });
          return safeParseCaseForWorkflowOutput(definition.outputSchema.shape.case, updatedCase);
        });
      }
    ),
  });
};
