/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ConfigurationBlock } from '../../../../common/domain_types';
import { FrameworkUser } from '../framework/adapter_types';

export interface ConfigurationBlockAdapter {
  getByIds(user: FrameworkUser, ids: string[]): Promise<ConfigurationBlock[]>;
  getForTags(
    user: FrameworkUser,
    tagIds: string[],
    page?: number,
    size?: number
  ): Promise<{ blocks: ConfigurationBlock[]; page: number; total: number }>;
  delete(
    user: FrameworkUser,
    blockIds: string[]
  ): Promise<Array<{ id: string; success: boolean; reason?: string }>>;
  create(user: FrameworkUser, configs: ConfigurationBlock[]): Promise<string[]>;
  deleteForTags(
    user: FrameworkUser,
    tagIds: string[]
  ): Promise<{ success: boolean; reason?: string }>;
}
