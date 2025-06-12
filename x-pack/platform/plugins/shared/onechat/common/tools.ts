/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsqlTool } from '@kbn/onechat-server';

export type EsqlToolCreateRequest = Omit<EsqlTool, 'id' | 'schema' | 'handler'> & {
  id: string;
};
