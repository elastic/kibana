/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpecDetail } from '../../../../../../common/connector_spec';
import type { GetConnectorSpecResponseV1 } from '../../../../../../common/routes/connector/response';
import {
  transformConnectorSpecActionSummaryResponse,
  transformConnectorSpecSummaryResponse,
} from '../../../transforms';

export const transformGetConnectorSpecResponse = (
  detail: ConnectorSpecDetail
): GetConnectorSpecResponseV1 => {
  const {
    id,
    display_name,
    description,
    icon,
    docs_url,
    minimum_license,
    is_technical_preview,
    supported_feature_ids,
    actions: _summaryActions,
    ...topLevel
  } = transformConnectorSpecSummaryResponse(detail);

  return {
    metadata: {
      id,
      display_name,
      description,
      minimum_license,
      supported_feature_ids,
      ...(icon !== undefined ? { icon } : {}),
      ...(docs_url !== undefined ? { docs_url } : {}),
      is_technical_preview,
    },
    schema: detail.formSchema,
    ...topLevel,
    actions: detail.actions.map((action) => ({
      ...transformConnectorSpecActionSummaryResponse(action),
      input_schema: action.inputSchema,
    })),
  };
};
