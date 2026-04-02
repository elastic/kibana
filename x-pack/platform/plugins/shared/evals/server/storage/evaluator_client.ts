/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import { EVALUATOR_SAVED_OBJECT_TYPE, type CustomEvaluatorAttributes } from './evaluator_storage';

export class EvaluatorClient {
  constructor(private readonly soClient: SavedObjectsClientContract) {}

  async create(attrs: CustomEvaluatorAttributes): Promise<SavedObject<CustomEvaluatorAttributes>> {
    return this.soClient.create<CustomEvaluatorAttributes>(EVALUATOR_SAVED_OBJECT_TYPE, attrs, {
      id: attrs.name,
    });
  }

  async get(id: string): Promise<SavedObject<CustomEvaluatorAttributes>> {
    return this.soClient.get<CustomEvaluatorAttributes>(EVALUATOR_SAVED_OBJECT_TYPE, id);
  }

  async find(options?: {
    shared?: boolean;
  }): Promise<SavedObjectsFindResponse<CustomEvaluatorAttributes>> {
    const filter =
      options?.shared != null
        ? `${EVALUATOR_SAVED_OBJECT_TYPE}.attributes.shared: ${options.shared}`
        : undefined;

    return this.soClient.find<CustomEvaluatorAttributes>({
      type: EVALUATOR_SAVED_OBJECT_TYPE,
      perPage: 1000,
      filter,
    });
  }

  async update(
    id: string,
    attrs: Partial<CustomEvaluatorAttributes>
  ): Promise<SavedObject<CustomEvaluatorAttributes>> {
    await this.soClient.update<CustomEvaluatorAttributes>(EVALUATOR_SAVED_OBJECT_TYPE, id, attrs);
    return this.get(id);
  }

  async delete(id: string): Promise<void> {
    await this.soClient.delete(EVALUATOR_SAVED_OBJECT_TYPE, id);
  }
}
