/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MongoClient } from 'mongodb';
import { SubActionConnector } from '@kbn/actions-plugin/server';
import type { ServiceParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import type { AxiosError } from 'axios';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/usage';
import type { z } from '@kbn/zod';
import type { MongoConnectorConfig, MongoConnectorSecrets } from './schemas';
import {
  SUB_ACTION,
  TestConnectorRequestSchema,
  ListCollectionsRequestSchema,
  FindRequestSchema,
  AggregateRequestSchema,
} from './schemas';

const DEFAULT_CONNECT_TIMEOUT_MS = 10000;

/**
 * MongoDB Connector for Kibana Stack Connectors.
 *
 * Uses connect-per-operation: each sub-action creates a MongoClient, runs the operation,
 * and closes the client to avoid connection leaks and keep behavior consistent in serverless.
 */
export class MongoConnector extends SubActionConnector<
  MongoConnectorConfig,
  MongoConnectorSecrets
> {
  constructor(params: ServiceParams<MongoConnectorConfig, MongoConnectorSecrets>) {
    super(params);
    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.TEST,
      method: 'testConnector',
      schema: TestConnectorRequestSchema,
    });
    this.registerSubAction({
      name: SUB_ACTION.LIST_COLLECTIONS,
      method: 'listCollections',
      schema: ListCollectionsRequestSchema,
    });
    this.registerSubAction({
      name: SUB_ACTION.FIND,
      method: 'find',
      schema: FindRequestSchema,
    });
    this.registerSubAction({
      name: SUB_ACTION.AGGREGATE,
      method: 'aggregate',
      schema: AggregateRequestSchema,
    });
  }

  private getConnectionUri(): string {
    const uri = this.secrets.connectionUri;
    if (!uri || typeof uri !== 'string') {
      throw new Error('MongoDB connection URI is required in secrets');
    }
    return uri;
  }

  /**
   * Returns the database this connector is bound to (from config).
   * Throws if config.database is missing.
   */
  private getDatabase(): string {
    const database = this.config.database;
    if (!database || typeof database !== 'string') {
      throw new Error('database is required in connector config');
    }
    return database;
  }

  /**
   * Creates a new MongoClient, connects, and returns it. Caller must call client.close() in finally.
   */
  private async getClient(): Promise<MongoClient> {
    const uri = this.getConnectionUri();
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: DEFAULT_CONNECT_TIMEOUT_MS,
    });
    await client.connect();
    return client;
  }

  public async testConnector(
    _params: z.infer<typeof TestConnectorRequestSchema>,
    _connectorUsageCollector: ConnectorUsageCollector
  ): Promise<{ ok: boolean }> {
    const client = await this.getClient();
    try {
      await client.db().admin().ping();
      this.logger.debug('MongoDB connector test successful');
      return { ok: true };
    } finally {
      await client.close();
    }
  }

  public async listCollections(
    params: z.infer<typeof ListCollectionsRequestSchema>,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<{ collections: Array<{ name: string; type?: string }> }> {
    connectorUsageCollector.addRequestBodyBytes(undefined, params);
    const client = await this.getClient();
    try {
      const database = this.getDatabase();
      const db = client.db(database);
      const cursor = db.listCollections(undefined, { nameOnly: params.nameOnly ?? true });
      const collections = await cursor.toArray();
      return {
        collections: collections.map((c) => ({
          name: c.name,
          ...(c.type != null && { type: c.type }),
        })),
      };
    } finally {
      await client.close();
    }
  }

  public async find(
    params: z.infer<typeof FindRequestSchema>,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<{ documents: unknown[] }> {
    connectorUsageCollector.addRequestBodyBytes(undefined, params);
    const client = await this.getClient();
    try {
      const database = this.getDatabase();
      const db = client.db(database);
      const collection = db.collection(params.collection);
      let cursor = collection.find(params.filter ?? {});
      if (params.sort) {
        cursor = cursor.sort(params.sort);
      }
      if (params.skip != null) {
        cursor = cursor.skip(params.skip);
      }
      if (params.limit != null) {
        cursor = cursor.limit(params.limit);
      }
      const documents = await cursor.toArray();
      return { documents };
    } finally {
      await client.close();
    }
  }

  public async aggregate(
    params: z.infer<typeof AggregateRequestSchema>,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<{ documents: unknown[] }> {
    connectorUsageCollector.addRequestBodyBytes(undefined, params);
    const client = await this.getClient();
    try {
      const database = this.getDatabase();
      const db = client.db(database);
      const collection = db.collection(params.collection);
      const documents = await collection.aggregate(params.pipeline).toArray();
      return { documents };
    } finally {
      await client.close();
    }
  }

  /**
   * Required by SubActionConnector (typed as AxiosError). This connector uses the Mongo driver,
   * so HTTP errors are not used; we only use error.message for any thrown error.
   */
  protected getResponseErrorMessage(error: AxiosError): string {
    return error?.message ?? 'MongoDB connector error';
  }
}
