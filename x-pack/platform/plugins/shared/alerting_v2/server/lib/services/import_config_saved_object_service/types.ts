/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImportConfigSavedObjectAttributes } from '../../../saved_objects';

export interface ImportConfigSavedObjectServiceContract {
  create(params: {
    attrs: ImportConfigSavedObjectAttributes;
    id?: string;
  }): Promise<{ id: string; version?: string }>;
  get(
    id: string,
    spaceId?: string
  ): Promise<{ id: string; attributes: ImportConfigSavedObjectAttributes; version?: string }>;
  update(params: {
    id: string;
    attrs: Partial<ImportConfigSavedObjectAttributes>;
    version?: string;
  }): Promise<{ id: string; version?: string }>;
  delete(params: { id: string }): Promise<void>;
  find(params: { page: number; perPage: number; search?: string }): Promise<{
    saved_objects: Array<{
      id: string;
      attributes: ImportConfigSavedObjectAttributes;
      version?: string;
    }>;
    total: number;
  }>;
}
