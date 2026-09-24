/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAttachmentAlreadyExistsError } from '@kbn/agent-builder-common';
import type { AttachmentPublicClient } from '@kbn/agent-builder-server';
import { IMPACT_ATTACHMENT_TYPE } from '../../../common/impact/attachment';
import type { Impact } from '../../../common/impact/impact';
import { stampImpactAttachment } from './stamp_impact_attachment';

const impact: Impact = {
  id: 'impact-1',
  spaceId: 'default',
  conversationId: 'conv-1',
  entities: [{ id: 'host-1' }],
  createdAt: '2026-09-01T00:00:00.000Z',
};

describe('stampImpactAttachment', () => {
  it('creates a by-reference attachment whose origin is the Impact document id', async () => {
    const client = {
      create: jest.fn().mockResolvedValue({ id: 'impact-1' }),
      update: jest.fn(),
    };

    await stampImpactAttachment({ client: client as unknown as AttachmentPublicClient, impact });

    expect(client.create).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      id: 'impact-1',
      type: IMPACT_ATTACHMENT_TYPE,
      origin: 'impact-1',
    });
    expect(client.update).not.toHaveBeenCalled();
  });

  it('updates the existing attachment when the conversation already has one', async () => {
    const client = {
      create: jest
        .fn()
        .mockRejectedValue(createAttachmentAlreadyExistsError({ attachmentId: 'impact-1' })),
      update: jest.fn().mockResolvedValue({ id: 'impact-1' }),
    };

    await stampImpactAttachment({ client: client as unknown as AttachmentPublicClient, impact });

    expect(client.update).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      attachmentId: 'impact-1',
      data: impact,
    });
  });
});
