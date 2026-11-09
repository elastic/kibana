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

/** The longest value Fleet stores for a setting of the onboarding record. */
export const MAX_PROXY_URL_LENGTH = 1024;

/** `http://` or `https://` followed by the start of a host (not another slash, a path or a space). */
const PROXY_URL_PREFIX = /^https?:\/\/[^/?#\\\s]/i;

/**
 * The proxy URL is optional. When set, it must be written as an `http(s)://` URL with a host.
 * The value is sent as typed, so the literal text is checked: `new URL()` alone also accepts
 * `http:proxy.local:3128` or `http:/proxy.local:3128`, which it repairs but the agent receives
 * unchanged.
 */
export const getProxyUrlError = (proxyUrl: string): string | undefined => {
  const trimmed = proxyUrl.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > MAX_PROXY_URL_LENGTH) {
    return i18n.translate('xpack.ingestHub.integrationSettings.proxyUrl.tooLongError', {
      defaultMessage: 'The proxy URL must be {max} characters or less.',
      values: { max: MAX_PROXY_URL_LENGTH },
    });
  }
  let hasHost = false;
  try {
    hasHost = PROXY_URL_PREFIX.test(trimmed) && new URL(trimmed).hostname !== '';
  } catch {
    // Reported below.
  }
  if (!hasHost) {
    return i18n.translate('xpack.ingestHub.integrationSettings.proxyUrl.invalidError', {
      defaultMessage: 'Enter a valid proxy URL starting with http:// or https://.',
    });
  }
};
