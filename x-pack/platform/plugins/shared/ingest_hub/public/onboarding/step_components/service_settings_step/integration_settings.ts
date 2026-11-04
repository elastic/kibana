/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CLOUD_ONBOARDING_INTEGRATION_NAME_MAX_LENGTH } from '@kbn/fleet-plugin/common';

import type { AwsServiceMatrixEntry, DeploymentMethod } from '../../aws_service_matrix';

/** Fleet's package policy name limit. */
export const MAX_POLICY_NAME_LENGTH = 255;

/**
 * The longest integration name, enforced by the Fleet API too. A policy name is the integration
 * name plus `-<suffix>` of at most 88 characters (an 80-character package and namespace stem and
 * two uniqueness counters). Capping it keeps every derived name within Fleet's limit, so no name
 * is cut, which would make two different suffixes collide.
 */
export const MAX_INTEGRATION_NAME_LENGTH = CLOUD_ONBOARDING_INTEGRATION_NAME_MAX_LENGTH;

/** Fleet's package policy description limit. */
export const MAX_DESCRIPTION_LENGTH = 2048;

/**
 * Integration name and description apply to every service that deploys as a package policy.
 * Managed integration skips ECF-only services, but agent-based deploys them too (it ignores the
 * advertised methods), so there only the method decides.
 */
export const supportsIntegrationSettings = (
  service: AwsServiceMatrixEntry,
  deploymentMethod?: DeploymentMethod
): boolean =>
  deploymentMethod === 'agent_based' ||
  !service.deploymentMethods.every((dm) => dm.method === 'ecf');

export const getIntegrationNameError = (name: string): string | undefined => {
  const trimmed = name.trim();
  if (!trimmed) {
    return i18n.translate('xpack.ingestHub.integrationSettings.name.requiredError', {
      defaultMessage: 'An integration name is required.',
    });
  }
  if (trimmed.length > MAX_INTEGRATION_NAME_LENGTH) {
    return i18n.translate('xpack.ingestHub.integrationSettings.name.tooLongError', {
      defaultMessage: 'The integration name must be {max} characters or less.',
      values: { max: MAX_INTEGRATION_NAME_LENGTH },
    });
  }
};

export const getDescriptionError = (description: string): string | undefined => {
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return i18n.translate('xpack.ingestHub.integrationSettings.description.tooLongError', {
      defaultMessage: 'The description must be {max} characters or less.',
      values: { max: MAX_DESCRIPTION_LENGTH },
    });
  }
};
