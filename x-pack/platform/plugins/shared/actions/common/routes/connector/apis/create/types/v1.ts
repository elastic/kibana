/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { createConnectorRequestParamsSchemaV1, createConnectorRequestBodySchemaV1 } from '..';

export type CreateConnectorRequestParams = TypeOf<typeof createConnectorRequestParamsSchemaV1>;
export type CreateConnectorRequestBody = TypeOf<typeof createConnectorRequestBodySchemaV1>;
