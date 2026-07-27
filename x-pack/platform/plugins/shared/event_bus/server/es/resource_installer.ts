/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { FailedAttemptError } from 'p-retry';
import pRetry from 'p-retry';
import { getIndexTemplate } from './index_template';
import type { EsNames } from './names';

const MAX_RETRY_DELAY = 30000;

export interface ResourceInstallerDeps {
  esClient: ElasticsearchClient;
  logger: Logger;
  names: EsNames;
  retention: string;
}

/**
 * Bootstraps (and idempotently updates) the event bus datastream and its
 * composable index template. Safe to run concurrently across multiple Kibana
 * nodes — template creation re-checks existence on error and datastream
 * creation swallows `resource_already_exists_exception`.
 */
export class ResourceInstaller {
  private installed?: Promise<boolean>;

  constructor(private readonly deps: ResourceInstallerDeps) {}

  /** Runs the install once; subsequent calls return the same promise. */
  public install(): Promise<boolean> {
    if (!this.installed) {
      this.installed = this.doInstall();
    }
    return this.installed;
  }

  public waitUntilReady(): Promise<boolean> {
    return this.install();
  }

  private async doInstall(): Promise<boolean> {
    try {
      await this.retry('create-index-template', () => this.createOrUpdateIndexTemplate());
      await this.retry('create-data-stream', () => this.createOrUpdateDataStream());
      this.deps.logger.debug(`event bus resources initialized (${this.deps.names.dataStream})`);
      return true;
    } catch (err) {
      this.deps.logger.error(`error initializing event bus resources: ${err.message}`);
      return false;
    }
  }

  private retry(operation: string, fn: () => Promise<void>): Promise<void> {
    return pRetry(fn, {
      minTimeout: 1000,
      maxTimeout: MAX_RETRY_DELAY,
      retries: 4,
      factor: 2,
      randomize: true,
      onFailedAttempt: (err: FailedAttemptError) => {
        this.deps.logger.warn(
          `event bus initialization step "${operation}" failed, ${err.retriesLeft} retries left: ${err.message}`
        );
      },
    });
  }

  private async createOrUpdateIndexTemplate(): Promise<void> {
    const { esClient, names, retention } = this.deps;
    const template = getIndexTemplate(names, retention);
    const exists = await esClient.indices.existsIndexTemplate({ name: names.indexTemplate });

    if (!exists) {
      try {
        await esClient.indices.putIndexTemplate({
          name: names.indexTemplate,
          body: template,
          create: true,
        });
      } catch (err) {
        // Concurrent bootstrap from another node may have created it between the
        // existence check and the create; only rethrow if it still doesn't exist.
        const existsNow = await esClient.indices.existsIndexTemplate({ name: names.indexTemplate });
        if (!existsNow) {
          throw new Error(`error creating event bus index template: ${err.message}`);
        }
      }
      return;
    }

    await esClient.indices.putIndexTemplate({ name: names.indexTemplate, body: template });
  }

  private async createOrUpdateDataStream(): Promise<void> {
    const { esClient, names } = this.deps;
    const exists = await this.doesDataStreamExist();

    if (!exists) {
      try {
        await esClient.indices.createDataStream({ name: names.dataStream });
      } catch (err) {
        if (err.body?.error?.type !== 'resource_already_exists_exception') {
          throw new Error(`error creating event bus data stream: ${err.message}`);
        }
      }
      return;
    }

    // Apply the latest mapping to existing backing indices.
    const simulated = await esClient.indices.simulateIndexTemplate({ name: names.dataStream });
    const mappings = simulated.template?.mappings;
    if (mappings) {
      await esClient.indices.putMapping({ index: names.dataStream, ...mappings });
    }
  }

  private async doesDataStreamExist(): Promise<boolean> {
    try {
      const response = await this.deps.esClient.indices.getDataStream({
        name: this.deps.names.dataStream,
        expand_wildcards: 'all',
      });
      return response.data_streams.length > 0;
    } catch (err) {
      if (err.meta?.statusCode === 404) {
        return false;
      }
      throw new Error(`error checking existence of event bus data stream: ${err.message}`);
    }
  }
}
