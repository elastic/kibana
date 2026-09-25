/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorAlertingHint, ConnectorMetadata } from '@kbn/connector-specs';
import type { GetConnectorSpecResponseV1 } from '../../../../../../common/routes/connector/response';

export interface GetConnectorSpecServiceResult {
  metadata: ConnectorMetadata;
  schema: Record<string, unknown>;
  actions: Record<string, { input: Record<string, unknown>; description?: string; scope: string }>;
  alerting?: ConnectorAlertingHint;
  isTestable: boolean;
}

export const transformGetConnectorSpecResponse = (
  spec: GetConnectorSpecServiceResult
): GetConnectorSpecResponseV1 => ({
  metadata: {
    id: spec.metadata.id,
    display_name: spec.metadata.displayName,
    description: spec.metadata.description,
    minimum_license: spec.metadata.minimumLicense as string,
    supported_feature_ids: spec.metadata.supportedFeatureIds ?? [],
    ...(spec.metadata.icon !== undefined ? { icon: spec.metadata.icon } : {}),
    ...(spec.metadata.docsUrl !== undefined ? { docs_url: spec.metadata.docsUrl } : {}),
    ...(spec.metadata.isTechnicalPreview !== undefined
      ? { is_technical_preview: spec.metadata.isTechnicalPreview }
      : {}),
  },
  schema: spec.schema,
  actions: spec.actions ?? {},
  ...(spec.alerting !== undefined
    ? {
        alerting: {
          default_action: spec.alerting.defaultAction,
          ...(spec.alerting.messageField !== undefined
            ? { message_field: spec.alerting.messageField }
            : {}),
        },
      }
    : {}),
  is_testable: spec.isTestable,
});
