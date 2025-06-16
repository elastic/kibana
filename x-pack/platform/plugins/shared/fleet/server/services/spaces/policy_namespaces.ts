/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../app_context';
import { PolicyNamespaceValidationError } from '../../../common/errors';

import { getSpaceSettings } from './space_settings';

export async function validatePolicyNamespaceForSpace({
  namespace,
  spaceId,
}: {
  namespace: string;
  spaceId?: string;
}) {
  const experimentalFeature = appContextService.getExperimentalFeatures();
  if (!experimentalFeature.useSpaceAwareness) {
    return;
  }
  const settings = await getSpaceSettings(spaceId);
  if (!settings.allowed_namespace_prefixes || settings.allowed_namespace_prefixes.length === 0) {
    return;
  }

  let valid = false;
  for (const allowedNamespacePrefix of settings.allowed_namespace_prefixes) {
    if (namespace.startsWith(allowedNamespacePrefix)) {
      valid = true;
      break;
    }
  }

  if (!valid) {
    throw new PolicyNamespaceValidationError(
      `Invalid namespace, supported namespace prefixes: ${settings.allowed_namespace_prefixes.join(
        ', '
      )}`
    );
  }
}

export async function validateAdditionalDatastreamsPermissionsForSpace({
  additionalDatastreamsPermissions,
  spaceId,
}: {
  additionalDatastreamsPermissions?: string[];
  spaceId?: string;
}) {
  const experimentalFeature = appContextService.getExperimentalFeatures();
  if (!experimentalFeature.useSpaceAwareness) {
    return;
  }
  const settings = await getSpaceSettings(spaceId);
  if (
    !settings.allowed_namespace_prefixes ||
    settings.allowed_namespace_prefixes.length === 0 ||
    !additionalDatastreamsPermissions ||
    !additionalDatastreamsPermissions.length
  ) {
    return;
  }

  for (const additionalDatastreamsPermission of additionalDatastreamsPermissions) {
    let valid = false;
    for (const allowedNamespacePrefix of settings.allowed_namespace_prefixes) {
      if (additionalDatastreamsPermission.startsWith(allowedNamespacePrefix)) {
        valid = true;
        break;
      }
    }

    if (!valid) {
      throw new PolicyNamespaceValidationError(
        `Invalid additionalDatastreamsPermission, supported namespace prefixes: ${settings.allowed_namespace_prefixes.join(
          ', '
        )}`
      );
    }
  }
}
