/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConnectorSpecActionSummary,
  ConnectorSpecSummary,
} from '../../../../../common/connector_spec';
import type { ConnectorSpecActionSummaryResponseV1 } from '../../../../../common/routes/connector/response';

export const transformConnectorSpecActionSummaryResponse = (
  action: ConnectorSpecActionSummary
): ConnectorSpecActionSummaryResponseV1 => ({
  name: action.name,
  is_tool: action.isTool,
  ...(action.description !== undefined ? { description: action.description } : {}),
  scope: action.scope,
});

export const transformConnectorSpecSummaryResponse = (summary: ConnectorSpecSummary) => ({
  id: summary.id,
  display_name: summary.displayName,
  description: summary.description,
  ...(summary.icon !== undefined ? { icon: summary.icon } : {}),
  ...(summary.docsUrl !== undefined ? { docs_url: summary.docsUrl } : {}),
  minimum_license: summary.minimumLicense as string,
  is_technical_preview: summary.isTechnicalPreview,
  supported_feature_ids: summary.supportedFeatureIds,
  availability: {
    enabled: summary.availability.enabled,
    enabled_in_config: summary.availability.enabledInConfig,
    enabled_in_license: summary.availability.enabledInLicense,
    is_deprecated: summary.availability.isDeprecated,
  },
  auth_type_ids: summary.authTypeIds,
  is_testable: summary.isTestable,
  has_inbound_events: summary.hasInboundEvents,
  is_inbound_only: summary.isInboundOnly,
  is_ears_experimental: summary.isEarsExperimental,
  actions: summary.actions.map(transformConnectorSpecActionSummaryResponse),
});
