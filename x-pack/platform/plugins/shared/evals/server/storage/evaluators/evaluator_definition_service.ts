/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import {
  EvaluatorDefinitionClient,
  type EvaluatorsStorageAdapter,
} from './evaluator_definition_client';
import { evaluatorsStorageSettings, type EvaluatorStorageProperties } from './evaluators_storage';

export class EvaluatorDefinitionService {
  constructor(
    private readonly logger: Logger,
    private readonly esClient: ElasticsearchClient,
    private readonly isServerless: boolean,
    private readonly isBuiltIn: (name: string) => boolean
  ) {}

  /**
   * A client scoped to `spaceId`. Required rather than defaulted so a new call
   * site has to state which space it is acting in.
   */
  getClient({ spaceId }: { spaceId: string }): EvaluatorDefinitionClient {
    return new EvaluatorDefinitionClient({
      storageAdapter: this.createStorageAdapter(),
      logger: this.logger,
      spaceId,
      isBuiltIn: this.isBuiltIn,
    });
  }

  private createStorageAdapter(): EvaluatorsStorageAdapter {
    return new StorageIndexAdapter<typeof evaluatorsStorageSettings, EvaluatorStorageProperties>(
      this.esClient,
      this.logger,
      evaluatorsStorageSettings,
      { isServerless: this.isServerless }
    );
  }
}
