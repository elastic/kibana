/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpecSummary } from '../../../../../../common/connector_spec';
import type { GetAllConnectorSpecsResponseV1 } from '../../../../../../common/routes/connector/response';
import { transformConnectorSpecSummaryResponseV1 } from '../../../transforms';

export const transformGetAllConnectorSpecsResponse = (
  summaries: ConnectorSpecSummary[]
): GetAllConnectorSpecsResponseV1 => summaries.map(transformConnectorSpecSummaryResponseV1);
