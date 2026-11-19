/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getConnectorSpecParamsSchema } from './schemas/latest';
export type { GetConnectorSpecParams } from './types/latest';

export { getConnectorSpecParamsSchema as getConnectorSpecParamsSchemaV1 } from './schemas/v1';
export type { GetConnectorSpecParams as GetConnectorSpecParamsV1 } from './types/v1';

export type { GetConnectorSpecResponseV1 } from '../../response';
export { getConnectorSpecResponseBodySchema as getConnectorSpecResponseBodySchemaV1 } from '../../response';
