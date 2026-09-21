/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAttachmentAlreadyExistsError } from '@kbn/agent-builder-common';
import type { AttachmentPublicClient } from '@kbn/agent-builder-server';
import { IMPACT_ATTACHMENT_TYPE } from '../../../common/impact/attachment';
import type { Impact } from '../../../common/impact/impact';

/** Puts a by-reference investigation_impact attachment on the conversation, origin = Impact id. */
export const stampImpactAttachment = async ({
  client,
  impact,
}: {
  client: AttachmentPublicClient;
  impact: Impact;
}): Promise<void> => {
  try {
    await client.create({
      conversationId: impact.conversationId,
      id: impact.id,
      type: IMPACT_ATTACHMENT_TYPE,
      origin: impact.id,
    });
  } catch (error) {
    if (!isAttachmentAlreadyExistsError(error)) {
      throw error;
    }
    await client.update({
      conversationId: impact.conversationId,
      attachmentId: impact.id,
      data: impact,
    });
  }
};
