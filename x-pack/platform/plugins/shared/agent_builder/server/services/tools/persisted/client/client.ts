/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { AuditLogger } from '@kbn/security-plugin/server';
import { createToolNotFoundError, createBadRequestError } from '@kbn/agent-builder-common';
import { createSpaceDslFilter } from '../../../../utils/spaces';
import type { ToolCreateParams, ToolTypeUpdateParams } from '../../tool_provider';
import type { ToolStorage } from './storage';
import { createStorage } from './storage';
import { fromEs, createAttributes, updateDocument } from './converters';
import type { ToolDocument, ToolPersistedDefinition } from './types';

/**
 * Client for persisted tool definitions.
 */
export interface ToolClient {
  get(toolId: string): Promise<ToolPersistedDefinition>;
  list(): Promise<ToolPersistedDefinition[]>;
  create(esqlTool: ToolCreateParams): Promise<ToolPersistedDefinition>;
  update(toolId: string, updates: ToolTypeUpdateParams): Promise<ToolPersistedDefinition>;
  delete(toolId: string): Promise<boolean>;
}

export const createClient = ({
  space,
  logger,
  esClient,
  auditLogger,
}: {
  space: string;
  logger: Logger;
  esClient: ElasticsearchClient;
  auditLogger: AuditLogger;
}): ToolClient => {
  const storage = createStorage({ logger, esClient });
  return new ToolClientImpl({ space, storage, auditLogger });
};

class ToolClientImpl {
  private readonly space: string;
  private readonly storage: ToolStorage;
  private readonly auditLogger: AuditLogger;

  constructor({
    space,
    storage,
    auditLogger,
  }: {
    space: string;
    storage: ToolStorage;
    auditLogger: AuditLogger;
  }) {
    this.space = space;
    this.storage = storage;
    this.auditLogger = auditLogger;
  }

  async get(id: string): Promise<ToolPersistedDefinition> {
    return this.withAudit(
      {
        action: 'agent_builder_tool_get',
        eventType: 'access',
        id,
        successMessage: `Accessed tool [id=${id}]`,
        failureMessage: `Failed to access tool [id=${id}]`,
      },
      async () => {
        const document = await this._get(id);
        if (!document) {
          throw createToolNotFoundError({
            toolId: id,
          });
        }
        return fromEs(document);
      }
    );
  }

  async list(): Promise<ToolPersistedDefinition[]> {
    return this.withAudit(
      {
        action: 'agent_builder_tool_list',
        eventType: 'access',
        successMessage: 'Listed tools',
        failureMessage: 'Failed to list tools',
      },
      async () => {
        const document = await this.storage.getClient().search({
          query: {
            bool: {
              filter: [createSpaceDslFilter(this.space)],
            },
          },
          size: 1000,
          track_total_hits: false,
        });

        return document.hits.hits.map((hit) => fromEs(hit as ToolDocument));
      }
    );
  }

  async create(createRequest: ToolCreateParams): Promise<ToolPersistedDefinition> {
    const { id } = createRequest;

    return this.withAudit(
      {
        action: 'agent_builder_tool_create',
        eventType: 'creation',
        id,
        successMessage: `Created tool [id=${id}]`,
        failureMessage: `Failed to create tool [id=${id}]`,
      },
      async () => {
        const document = await this._get(id);
        if (document) {
          throw createBadRequestError(`Tool with id '${id}' already exists.`);
        }

        const attributes = createAttributes({ createRequest, space: this.space });

        await this.storage.getClient().index({
          document: attributes,
        });

        return this.get(id);
      }
    );
  }

  async update(id: string, update: ToolTypeUpdateParams): Promise<ToolPersistedDefinition> {
    return this.withAudit(
      {
        action: 'agent_builder_tool_update',
        eventType: 'change',
        id,
        successMessage: `Updated tool [id=${id}]`,
        failureMessage: `Failed to update tool [id=${id}]`,
      },
      async () => {
        const document = await this._get(id);
        if (!document) {
          throw createToolNotFoundError({
            toolId: id,
          });
        }

        const updatedAttributes = updateDocument({
          current: document._source!,
          update,
        });

        await this.storage.getClient().index({
          id: document._id,
          document: updatedAttributes,
        });

        return fromEs({
          _id: document._id,
          _source: updatedAttributes,
        });
      }
    );
  }

  async delete(id: string): Promise<boolean> {
    return this.withAudit(
      {
        action: 'agent_builder_tool_delete',
        eventType: 'deletion',
        id,
        successMessage: `Deleted tool [id=${id}]`,
        failureMessage: `Failed to delete tool [id=${id}]`,
      },
      async () => {
        const document = await this._get(id);
        if (!document) {
          throw createToolNotFoundError({ toolId: id });
        }
        const result = await this.storage.getClient().delete({ id: document._id });
        if (result.result === 'not_found') {
          throw createToolNotFoundError({ toolId: id });
        }
        return true;
      }
    );
  }

  async _get(id: string): Promise<ToolDocument | undefined> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: [createSpaceDslFilter(this.space), { term: { id } }],
        },
      },
    });
    if (response.hits.hits.length === 0) {
      return undefined;
    } else {
      return response.hits.hits[0] as ToolDocument;
    }
  }

  private async withAudit<T>(
    event: {
      action: string;
      eventType: string;
      id?: string;
      successMessage: string;
      failureMessage: string;
    },
    operation: () => Promise<T>
  ): Promise<T> {
    try {
      const result = await operation();
      this.logAudit({
        ...event,
        message: event.successMessage,
        outcome: 'success',
      });
      return result;
    } catch (error) {
      this.logAudit({
        ...event,
        message: event.failureMessage,
        outcome: 'failure',
        error,
      });
      throw error;
    }
  }

  private logAudit(event: {
    action: string;
    eventType: string;
    id?: string;
    message: string;
    outcome: 'success' | 'failure';
    error?: unknown;
  }) {
    const errorInfo = event.error
      ? {
          code: event.error instanceof Error ? event.error.name : 'Error',
          message: event.error instanceof Error ? event.error.message : String(event.error),
        }
      : undefined;

    const kibanaMeta = {
      ...(event.id
        ? {
            saved_object: {
              type: 'agent_builder_tool',
              id: event.id,
            },
          }
        : {}),
      space_ids: [this.space],
    };

    this.auditLogger.log({
      message: event.message,
      event: {
        action: event.action,
        category: ['database'],
        type: [event.eventType],
        outcome: event.outcome,
      },
      kibana: kibanaMeta,
      ...(errorInfo ? { error: errorInfo } : {}),
    });
  }
}
