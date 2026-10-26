/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionScope } from '@kbn/connector-specs';
import type { GetConnectorSpecResponseV1 } from '../../../../common/routes/connector/response';

export const formatConnectorSpecAction = ({
  name,
  description,
  isTool,
  scope,
}: {
  name: string;
  description?: string;
  isTool: boolean;
  scope?: ActionScope;
}): GetConnectorSpecResponseV1['actions'][number] => ({
  name,
  is_tool: isTool,
  ...(description !== undefined ? { description } : {}),
  ...(scope !== undefined ? { scope } : {}),
});
