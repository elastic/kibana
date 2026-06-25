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
import { adminMlCapabilities } from '@kbn/ml-common-types/capabilities';
import type { MlClient } from '../ml_client';
import { mlLog } from '../log';
import { upgradeCheckProvider } from './upgrade';
import type { MlLicense } from '../../../common/license';
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

async function checkMlCapabilitiesViaPrivileges(
  authorization: MlAuthorizationService,
  request: KibanaRequest,
  capabilities: MlCapabilitiesKey[]
): Promise<boolean> {
  const kibanaPrivileges = capabilities.map((cap) => authorization.actions.ui.get('ml', cap));
  const { hasAllRequested } = await authorization
    .checkPrivilegesWithRequest(request)
    .globally({ kibana: kibanaPrivileges });
  return hasAllRequested;
}

export function hasMlCapabilitiesProvider(
  resolveMlCapabilities: ResolveMlCapabilities,
  request: KibanaRequest,
  authorization?: MlAuthorizationService
) {
  let mlCapabilities: MlCapabilities | null = null;

  const resolveMlCapabilitiesOnce = once(resolveMlCapabilities);

  return async (capabilities: MlCapabilitiesKey[]) => {
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
      if (request.isFakeRequest && authorization) {
        const hasPrivileges = await checkMlCapabilitiesViaPrivileges(
          authorization,
          request,
          capabilities
        );
        if (hasPrivileges) {
          return;
        }
      }

      throw new InsufficientMLCapabilities('Insufficient privileges to access feature');
    }
  };
}
