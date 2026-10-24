/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetConnectorSpecResult } from '../../../../../application/connector/methods/get_connector_spec/types';
import type { GetConnectorSpecResponseV1 } from '../../../../../../common/routes/connector/response';
import { transformConnectorSpecActionSummaryResponse } from '../../../transforms';

export const transformGetConnectorSpecResponse = (
  spec: GetConnectorSpecResult
): GetConnectorSpecResponseV1 => ({
  metadata: {
    id: spec.metadata.id,
    display_name: spec.metadata.displayName,
    description: spec.metadata.description,
    minimum_license: spec.metadata.minimumLicense as string,
    supported_feature_ids: spec.metadata.supportedFeatureIds,
    ...(spec.metadata.icon !== undefined ? { icon: spec.metadata.icon } : {}),
    ...(spec.metadata.docsUrl !== undefined ? { docs_url: spec.metadata.docsUrl } : {}),
    ...(spec.metadata.isTechnicalPreview !== undefined
      ? { is_technical_preview: spec.metadata.isTechnicalPreview }
      : {}),
  },
  schema: spec.schema,
  is_testable: spec.isTestable,
  auth_type_ids: spec.authTypeIds,
  has_inbound_events: spec.hasInboundEvents,
  is_inbound_only: spec.isInboundOnly,
  is_ears_experimental: spec.isEarsExperimental,
  actions: spec.actions.map((action) => ({
    ...transformConnectorSpecActionSummaryResponse(action),
    input_schema: action.inputSchema,
  })),
});
