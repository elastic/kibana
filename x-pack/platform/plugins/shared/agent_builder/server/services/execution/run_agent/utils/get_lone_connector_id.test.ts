/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type { ProcessedConversation } from './prepare_conversation';
import { getLoneConnectorIdFromProcessedConversation } from './get_lone_connector_id';

const makeConnectorVersionedAttachment = (connectorId: string) => ({
  id: 'att-1',
  type: AttachmentType.connector,
  current_version: 1,
  versions: [
    {
      version: 1,
      data: {
        connector_id: connectorId,
        connector_name: 'Test',
        connector_type: '.test',
      },
      created_at: '2020-01-01T00:00:00.000Z',
      content_hash: 'hash',
    },
  ],
});

describe('getLoneConnectorIdFromProcessedConversation', () => {
  it('returns undefined when there are no active attachments', () => {
    const processedConversation = {
      attachmentStateManager: { getActive: () => [] },
    } as unknown as ProcessedConversation;
    expect(getLoneConnectorIdFromProcessedConversation(processedConversation)).toBeUndefined();
  });

  it('returns undefined when there are multiple connector attachments', () => {
    const processedConversation = {
      attachmentStateManager: {
        getActive: () => [
          makeConnectorVersionedAttachment('a'),
          makeConnectorVersionedAttachment('b'),
        ],
      },
    } as unknown as ProcessedConversation;
    expect(getLoneConnectorIdFromProcessedConversation(processedConversation)).toBeUndefined();
  });

  it('returns undefined when a non-connector attachment is the only active one', () => {
    const processedConversation = {
      attachmentStateManager: {
        getActive: () => [
          {
            id: 't1',
            type: AttachmentType.text,
            current_version: 1,
            versions: [
              {
                version: 1,
                data: { content: 'x' },
                created_at: '2020-01-01T00:00:00.000Z',
                content_hash: 'h',
              },
            ],
          },
        ],
      },
    } as unknown as ProcessedConversation;
    expect(getLoneConnectorIdFromProcessedConversation(processedConversation)).toBeUndefined();
  });

  it('returns connector_id when exactly one connector attachment is active', () => {
    const processedConversation = {
      attachmentStateManager: {
        getActive: () => [makeConnectorVersionedAttachment('only-conn')],
      },
    } as unknown as ProcessedConversation;
    expect(getLoneConnectorIdFromProcessedConversation(processedConversation)).toBe('only-conn');
  });

  it('returns connector_id when one connector and other non-connector attachments exist', () => {
    const processedConversation = {
      attachmentStateManager: {
        getActive: () => [
          {
            id: 't1',
            type: AttachmentType.text,
            current_version: 1,
            versions: [
              {
                version: 1,
                data: { content: 'x' },
                created_at: '2020-01-01T00:00:00.000Z',
                content_hash: 'h',
              },
            ],
          },
          makeConnectorVersionedAttachment('lone-conn'),
        ],
      },
    } as unknown as ProcessedConversation;
    expect(getLoneConnectorIdFromProcessedConversation(processedConversation)).toBe('lone-conn');
  });
});
