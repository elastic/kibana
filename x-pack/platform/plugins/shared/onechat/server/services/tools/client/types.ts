/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolDescriptor } from '@kbn/onechat-common';
import type { GetResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ToolProperties } from './storage';

export type ToolDocument = Pick<GetResponse<ToolProperties>, '_source' | '_id'>;

export type ToolPersistedDefinition<TConfig extends object = {}> = ToolDescriptor<TConfig> & {
  created_at: string;
  updated_at: string;
};
