/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConnectorType,
  ConnectorTypeSpecFields,
} from '../../../../../application/connector/types';
import type { GetAllConnectorTypesResponseV1 } from '../../../../../../common/routes/connector/response';
import { transformConnectorSpecActionSummaryResponseV1 } from '../../../transforms';

const transformSpecFieldsV1 = (spec: ConnectorTypeSpecFields | undefined) => {
  if (spec === undefined) {
    return {};
  }
  return {
    ...(spec.icon !== undefined ? { icon: spec.icon } : {}),
    ...(spec.docsUrl !== undefined ? { docs_url: spec.docsUrl } : {}),
    auth_type_ids: spec.authTypeIds,
    has_inbound_events: spec.hasInboundEvents,
    is_inbound_only: spec.isInboundOnly,
    is_ears_experimental: spec.isEarsExperimental,
    actions: spec.actions.map(transformConnectorSpecActionSummaryResponseV1),
  };
};

export const transformListTypesResponse = (
  results: ConnectorType[],
  options: { includeSpecFields?: boolean } = {}
): GetAllConnectorTypesResponseV1 => {
  return results.map(
    ({
      id,
      name,
      enabled,
      enabledInConfig,
      enabledInLicense,
      minimumLicenseRequired,
      supportedFeatureIds,
      isSystemActionType,
      source,
      subFeature,
      isDeprecated,
      allowMultipleSystemActions,
      description,
      isExperimental,
      isTestable,
      spec,
    }) => ({
      id,
      name,
      enabled,
      enabled_in_config: enabledInConfig,
      enabled_in_license: enabledInLicense,
      minimum_license_required: minimumLicenseRequired,
      supported_feature_ids: supportedFeatureIds,
      is_system_action_type: isSystemActionType,
      source,
      sub_feature: subFeature,
      is_deprecated: isDeprecated,
      allow_multiple_system_actions: allowMultipleSystemActions,
      description,
      is_experimental: isExperimental,
      is_testable: Boolean(isTestable),
      ...(options.includeSpecFields === true ? transformSpecFieldsV1(spec) : {}),
    })
  );
};
