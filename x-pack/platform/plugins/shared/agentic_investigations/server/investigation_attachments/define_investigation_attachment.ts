/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { z } from '@kbn/zod/v4';
import type {
  AgentBuilderPluginSetup,
  AttachmentPublicClient,
  ConversationPublicClient,
  ToolHandlerContext,
} from '@kbn/agent-builder-server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { IndexStorageSettings, StorageDocumentOf } from '@kbn/storage-adapter';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type {
  InvestigationAttachmentDocument,
  StoredInvestigationAttachment,
} from '../../common/investigation_attachments';
import type { WrittenInvestigationAttachment } from './attachment_doc_service';
import {
  InvestigationAttachmentDocService,
  type InvestigationAttachmentStorage,
} from './attachment_doc_service';
import { attachFromTool, type AttachedFromTool } from './attach_from_tool';
import { attachWithPublicClient } from './attach_with_public_client';
import { createInvestigationAttachmentType } from './create_attachment_type';

export interface InvestigationAttachmentConfig<
  TType extends string,
  TSettings extends IndexStorageSettings,
  TStored extends StoredInvestigationAttachment
> {
  /** Agent Builder attachment type id. Must be on Agent Builder's builtin attachment allow-list. */
  type: TType;
  /**
   * Hidden index and mappings. `name` should start with `.kibana-` (see README "Index naming"),
   * and `spaceId` / `conversationId` must be keywords. Mapping changes must stay additive.
   */
  storageSettings: TSettings;
  /** Full stored document, accepting every shape earlier versions wrote. Used to validate. */
  schema: z.ZodType<InvestigationAttachmentDocument<TStored>>;
  /** Upper bound on documents per conversation; 1 (the default) for one document per conversation. */
  maxDocumentsPerConversation?: number;
  /** Text the LLM sees for the attachment. */
  format: (document: InvestigationAttachmentDocument<TStored>) => string;
  /** Rules the agent follows when the attachment is in the conversation. */
  agentDescription: string;
  /** Conversation attachment label; defaults to none. */
  describe?: (document: InvestigationAttachmentDocument<TStored>) => string;
  isStale?: (
    stored: InvestigationAttachmentDocument<TStored>,
    current: InvestigationAttachmentDocument<TStored>
  ) => boolean;
  maxContentLength?: number;
}

/** How a write reads and changes the document, shared by the route and tool paths. */
export interface InvestigationAttachmentWrite<TStored extends StoredInvestigationAttachment> {
  service: InvestigationAttachmentDocService<TStored>;
  id: string;
  spaceId: string;
  mutate: (current: InvestigationAttachmentDocument<TStored> | undefined) => TStored;
}

/**
 * Stateless pieces of one by-reference investigation attachment. The plugin creates the service
 * in `start` and hands a getter to the setup-time registrations.
 */
export interface InvestigationAttachmentDefinition<
  TType extends string,
  TStored extends StoredInvestigationAttachment
> {
  type: TType;
  /** Storage and service on the internal user; callers authorize and pass the request's space. */
  createService: (deps: {
    esClient: ElasticsearchClient;
    logger: Logger;
  }) => InvestigationAttachmentDocService<TStored>;
  /** Service over an existing storage client, for tests and wrappers that own the client. */
  createServiceFromStorage: (
    storage: InvestigationAttachmentStorage<TStored>
  ) => InvestigationAttachmentDocService<TStored>;
  createAttachmentType: (deps: {
    getService: () => InvestigationAttachmentDocService<TStored>;
    logger: Logger;
  }) => AttachmentTypeDefinition<TType, InvestigationAttachmentDocument<TStored>>;
  /** Setup-time registration with Agent Builder. */
  registerAttachmentType: (
    agentBuilder: AgentBuilderPluginSetup,
    deps: { getService: () => InvestigationAttachmentDocService<TStored>; logger: Logger }
  ) => void;
  /** Route / step path: owner check, index write, public-client attach, revert on failure. */
  writeAndAttach: (
    args: InvestigationAttachmentWrite<TStored> & {
      conversationId: string;
      conversations: ConversationPublicClient;
      attachments: AttachmentPublicClient;
    }
  ) => Promise<InvestigationAttachmentDocument<TStored>>;
  /** Agent tool path: index write, then add or update through the run's attachment state. */
  writeFromTool: (
    args: InvestigationAttachmentWrite<TStored> & {
      context: Pick<ToolHandlerContext, 'attachments' | 'request'>;
    }
  ) => Promise<AttachedFromTool<TStored>>;
}

/**
 * Defines a by-reference investigation attachment backed by its own hidden index: storage,
 * an OCC document service, the readonly Agent Builder type, and the two write paths. Each entity
 * keeps its own tools and renderer; see `createInvestigationTool` and the public
 * `registerInvestigationAttachmentRenderer`.
 */
export const defineInvestigationAttachment = <
  TType extends string,
  TSettings extends IndexStorageSettings,
  TStored extends StoredInvestigationAttachment & Partial<StorageDocumentOf<TSettings>>
>(
  config: InvestigationAttachmentConfig<TType, TSettings, TStored>
): InvestigationAttachmentDefinition<TType, TStored> => {
  const createServiceFromStorage = (storage: InvestigationAttachmentStorage<TStored>) =>
    new InvestigationAttachmentDocService<TStored>({
      type: config.type,
      storage,
      maxDocumentsPerConversation: config.maxDocumentsPerConversation,
    });

  const buildAttachmentType = <TId extends string>(
    type: TId,
    {
      getService,
      logger,
    }: Parameters<InvestigationAttachmentDefinition<TType, TStored>['createAttachmentType']>[0]
  ) =>
    createInvestigationAttachmentType<TId, TStored>({
      type,
      schema: config.schema,
      getService,
      logger,
      format: config.format,
      agentDescription: config.agentDescription,
      isStale: config.isStale,
      maxContentLength: config.maxContentLength,
    });

  return {
    type: config.type,
    createService: ({ esClient, logger }) =>
      createServiceFromStorage(
        new StorageIndexAdapter<TSettings, TStored>(
          esClient,
          logger,
          config.storageSettings
        ).getClient()
      ),
    createServiceFromStorage,
    createAttachmentType: (deps) => buildAttachmentType(config.type, deps),
    registerAttachmentType: (agentBuilder, deps) => {
      agentBuilder.attachments.registerType(
        // The registry is typed for the erased `AttachmentTypeDefinition`, so a definition
        // narrowed to its own data shape needs the cast every attachment-owning plugin makes.
        buildAttachmentType<string>(config.type, deps) as Parameters<
          typeof agentBuilder.attachments.registerType
        >[0]
      );
    },
    writeAndAttach: ({
      service,
      id,
      spaceId,
      mutate,
      conversationId,
      conversations,
      attachments,
    }) =>
      attachWithPublicClient<TStored>({
        type: config.type,
        conversations,
        attachments,
        conversationId,
        read: async () => {
          const current = await service.get(id, spaceId);
          if (!current) {
            throw new Error(`Investigation attachment ${config.type} [${id}] disappeared`);
          }
          return current;
        },
        write: () => service.upsert({ id, mutate }),
        revert: (written: WrittenInvestigationAttachment<TStored>) => service.revert(written),
      }),
    writeFromTool: ({ service, id, spaceId, mutate, context }) =>
      attachFromTool<TStored>({
        type: config.type,
        context,
        read: () => service.get(id, spaceId),
        write: () => service.upsert({ id, mutate }),
        revert: (result) => service.revert(result),
        describe: config.describe,
      }),
  };
};
