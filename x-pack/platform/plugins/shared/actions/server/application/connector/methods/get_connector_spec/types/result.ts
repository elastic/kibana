/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorMetadata } from '@kbn/connector-specs';
import type { ConnectorSpecDetail } from '../../../../../../common/connector_spec';

export type GetConnectorSpecResult = Pick<
  ConnectorSpecDetail,
  | 'isTestable'
  | 'authTypeIds'
  | 'hasInboundEvents'
  | 'isInboundOnly'
  | 'isEarsExperimental'
  | 'actions'
  | 'skill'
> & {
  metadata: ConnectorMetadata;
  schema: Record<string, unknown>;
};
