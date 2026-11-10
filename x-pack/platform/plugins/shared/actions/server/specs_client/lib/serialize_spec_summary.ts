/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionDefinition, ConnectorSpec } from '@kbn/connector-specs';
import {
  connectorSpecHasEvents,
  EARS_AUTH_ID,
  isInboundOnlyConnectorSpec,
  resolveActionScope,
} from '@kbn/connector-specs';
import type {
  ConnectorSpecActionSummary,
  ConnectorSpecSummary,
} from '../../../common/connector_spec';
import type { RegisteredSpec } from './get_registered_spec';

export const getAuthTypeIds = (spec: ConnectorSpec): string[] => {
  const types = spec.auth?.types;
  if (!types) {
    return [];
  }
  return types.map((authType) => (typeof authType === 'string' ? authType : authType.type));
};

export const isEarsExperimentalSpec = (spec: ConnectorSpec): boolean =>
  (spec.auth?.types ?? []).some(
    (authType) =>
      typeof authType !== 'string' &&
      authType.type === EARS_AUTH_ID &&
      authType.isExperimental === true
  );

export const serializeSpecActionSummary = (
  name: string,
  def: ActionDefinition
): ConnectorSpecActionSummary => ({
  name,
  ...(def.description !== undefined ? { description: def.description } : {}),
  isTool: Boolean(def.isTool),
  scope: resolveActionScope(def),
});

export const serializeSpecSummary = ({ spec, type }: RegisteredSpec): ConnectorSpecSummary => ({
  id: spec.metadata.id,
  displayName: spec.metadata.displayName,
  description: spec.metadata.description,
  ...(spec.metadata.icon !== undefined ? { icon: spec.metadata.icon } : {}),
  ...(spec.metadata.docsUrl !== undefined ? { docsUrl: spec.metadata.docsUrl } : {}),
  minimumLicense: spec.metadata.minimumLicense,
  isTechnicalPreview: spec.metadata.isTechnicalPreview ?? false,
  supportedFeatureIds: spec.metadata.supportedFeatureIds,
  availability: {
    enabled: type.enabled,
    enabledInConfig: type.enabledInConfig,
    enabledInLicense: type.enabledInLicense,
    isDeprecated: type.isDeprecated,
  },
  authTypeIds: getAuthTypeIds(spec),
  isTestable: Boolean(spec.test.enabled),
  hasInboundEvents: connectorSpecHasEvents(spec),
  isInboundOnly: isInboundOnlyConnectorSpec(spec),
  isEarsExperimental: isEarsExperimentalSpec(spec),
  actions: Object.entries(spec.actions).map(([name, def]) => serializeSpecActionSummary(name, def)),
});
