/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { once } from 'lodash';
import type {
  MlCapabilities,
  MlCapabilitiesResponse,
  ResolveMlCapabilities,
  MlCapabilitiesKey,
} from '@kbn/ml-common-types/capabilities';
import {
  adminMlCapabilities,
  basicLicenseMlCapabilities,
  featureCapabilities,
} from '@kbn/ml-common-types/capabilities';
import type { MlClient } from '../ml_client';
import { mlLog } from '../log';
import { upgradeCheckProvider } from './upgrade';
import type { MlLicense } from '../../../common/license';
import type { MlFeatures } from '../../../common/constants/app';
import {
  InsufficientMLCapabilities,
  UnknownMLCapabilitiesError,
  MLPrivilegesUninitialized,
} from './errors';

export function capabilitiesProvider(
  mlClient: MlClient,
  capabilities: MlCapabilities,
  mlLicense: MlLicense,
  isMlEnabledInSpace: () => Promise<boolean>
) {
  const { isUpgradeInProgress } = upgradeCheckProvider(mlClient);
  async function getCapabilities(): Promise<MlCapabilitiesResponse> {
    const upgradeInProgress = await isUpgradeInProgress();
    const isPlatinumOrTrialLicense = mlLicense.isFullLicense();
    const mlFeatureEnabledInSpace = await isMlEnabledInSpace();

    if (upgradeInProgress === true) {
      // if an upgrade is in progress, set all admin capabilities to false
      disableAdminPrivileges(capabilities);
    }

    return {
      capabilities,
      upgradeInProgress,
      isPlatinumOrTrialLicense,
      mlFeatureEnabledInSpace,
    };
  }
  return { getCapabilities };
}

function disableAdminPrivileges(capabilities: MlCapabilities) {
  Object.keys(adminMlCapabilities).forEach((k) => {
    capabilities[k as keyof MlCapabilities] = false;
  });
  capabilities.canCreateAnnotation = false;
  capabilities.canDeleteAnnotation = false;
}

export type HasMlCapabilities = (capabilities: MlCapabilitiesKey[]) => Promise<void>;

export type MlAuthorizationService = SecurityPluginSetup['authz'];

/**
 * Checks ML UI privileges for the user bound to the request (cookie or API key).
 * Uses the current space when Spaces is enabled so space-scoped roles work.
 */
async function checkMlCapabilitiesViaPrivileges(
  authorization: MlAuthorizationService,
  request: KibanaRequest,
  capabilities: MlCapabilitiesKey[]
): Promise<boolean> {
  const kibanaPrivileges = capabilities.map((cap) => authorization.actions.ui.get('ml', cap));
  const { hasAllRequested } = await authorization.checkPrivilegesDynamicallyWithRequest(request)({
    kibana: kibanaPrivileges,
  });
  return hasAllRequested;
}

/**
 * License + plugin feature gates for requested ML capabilities.
 * Uses plugin-configured {@link MlFeatures}, not request-resolved UI capabilities
 * (those are all-false on unauthenticated fake requests).
 */
export function areCapabilitiesAllowedByLicenseAndFeatures(
  enabledFeatures: MlFeatures,
  requestedCapabilities: MlCapabilitiesKey[],
  mlLicense: MlLicense
): boolean {
  if (!mlLicense.isMlEnabled()) {
    return false;
  }

  return requestedCapabilities.every((cap) => {
    if (featureCapabilities.ad.includes(cap) && !enabledFeatures.ad) {
      return false;
    }
    if (featureCapabilities.dfa.includes(cap) && !enabledFeatures.dfa) {
      return false;
    }
    if (featureCapabilities.nlp.includes(cap) && !enabledFeatures.nlp) {
      return false;
    }

    if (!basicLicenseMlCapabilities.includes(cap) && !mlLicense.isFullLicense()) {
      return false;
    }

    return true;
  });
}

export function hasMlCapabilitiesProvider(
  resolveMlCapabilities: ResolveMlCapabilities,
  request: KibanaRequest,
  authorization?: MlAuthorizationService,
  mlLicense?: MlLicense,
  enabledFeatures?: MlFeatures
) {
  let mlCapabilities: MlCapabilities | null = null;

  const resolveMlCapabilitiesOnce = once(resolveMlCapabilities);

  return async (capabilities: MlCapabilitiesKey[]) => {
    // Fake requests (Agent Builder / Task Manager) are not authenticated for UI
    // capability resolution — Security disables all caps. Authorize against the
    // real user via the request API key, and gate with license + plugin features.
    if (request.isFakeRequest) {
      if (!authorization || !mlLicense || !enabledFeatures) {
        throw new InsufficientMLCapabilities('Insufficient privileges to access feature');
      }

      const hasPrivileges = await checkMlCapabilitiesViaPrivileges(
        authorization,
        request,
        capabilities
      );
      if (
        hasPrivileges &&
        areCapabilitiesAllowedByLicenseAndFeatures(enabledFeatures, capabilities, mlLicense)
      ) {
        return;
      }

      throw new InsufficientMLCapabilities('Insufficient privileges to access feature');
    }

    try {
      mlCapabilities = await resolveMlCapabilitiesOnce(request);
    } catch (e) {
      mlLog.error(e);
      throw new UnknownMLCapabilitiesError(`Unable to perform ML capabilities check ${e}`);
    }

    if (mlCapabilities === null) {
      throw new MLPrivilegesUninitialized('ML capabilities have not been initialized');
    }

    if (capabilities.every((c) => mlCapabilities![c] === true) === false) {
      throw new InsufficientMLCapabilities('Insufficient privileges to access feature');
    }
  };
}
