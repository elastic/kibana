/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpecActionSummary } from '../../../../common/connector_spec';
import type { GetConnectorSpecResponseV1 } from '../../../../common/routes/connector/response';

export const formatConnectorSpecAction = ({
  name,
  description,
  isTool,
  scope,
}: ConnectorSpecActionSummary): GetConnectorSpecResponseV1['actions'][number] => ({
  name,
  is_tool: isTool,
  ...(description !== undefined ? { description } : {}),
  scope,
});
