/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorWithExtraFindData } from '../../../../../application/connector/types';
import type { GetAllConnectorsResponseV1 } from '../../../../../../common/routes/connector/response';
import { transformConnectorResponse } from '../../../common_transforms/transform_connector_response/v1';

export const transformGetAllConnectorsResponse = (
  results: ConnectorWithExtraFindData[]
): GetAllConnectorsResponseV1 => {
  return results.map(({ referencedByCount, ...connector }) => ({
    ...transformConnectorResponse(connector),
    referenced_by_count: referencedByCount,
  }));
};
