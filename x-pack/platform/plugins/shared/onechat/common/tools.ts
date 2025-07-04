/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsqlToolDefinition } from '@kbn/onechat-server';

export type EsqlToolApiObj = EsqlToolDefinition & {
  id: string;
  created_at: string;
  updated_at: string;
};

export type EsqlToolCreateRequest = EsqlToolApiObj;
export type EsqlToolCreateResponse = EsqlToolApiObj;
export type EsqlToolUpdateRequest = Partial<EsqlToolApiObj>;
