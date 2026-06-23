/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { domainEventBus } from '@kbn/domain-events';
import { ATTACHMENTS_ADDED_EVENT_TYPE } from '@kbn/domain-events/events/cases';
import type { Case } from '../../../common/types/domain';
import type { Owner } from '../../../common/constants/types';
import type { CasesClientArgs } from '..';

export function emitAttachmentsAddedEvent(
  clientArgs: CasesClientArgs,
  updatedCase: Case,
  attachmentIds: string[],
  attachmentType: string
): void {
  domainEventBus.publish({
    type: ATTACHMENTS_ADDED_EVENT_TYPE,
    payload: {
      caseId: updatedCase.id,
      attachmentIds,
      attachmentType,
      owner: updatedCase.owner as Owner,
    },
    request: clientArgs.request,
  });
  // clientArgs.casesEventBus?.emitAttachmentsAdded(clientArgs.request, {
  //   caseId: updatedCase.id,
  //   attachmentIds,
  //   attachmentType,
  //   owner: updatedCase.owner as Owner,
  // });
}
