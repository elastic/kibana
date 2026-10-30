/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_ID, FEATURE_ID_V3, FEATURE_ID_V4 } from '../../../common/constants';
import { isTopLevelAppEnabled } from '../../common/top_level_app';
import { useGetAvailableOwners } from '../../containers/use_get_available_owners';
import { useKibana } from '../../common/lib/kibana';
import type { CasesPermissions } from '../../containers/types';
import { allCasePermissions } from '../../utils/permissions';

type Capability = Exclude<keyof CasesPermissions, 'all'>;

/**
 *
 * @param capabilities : specifies the requirements for a valid owner, an owner will be included if it has the specified
 *  capabilities
 **/

export const useAvailableCasesOwners = (
  capabilities: Capability[] = allCasePermissions
): string[] => {
  const { capabilities: kibanaCapabilities } = useKibana().services.application;
  const topLevelAppEnabled = isTopLevelAppEnabled();
  const { data: availableOwners = [] } = useGetAvailableOwners({ enabled: topLevelAppEnabled });

  if (topLevelAppEnabled) {
    // casesV4 grants every owner alike, so its capabilities gate all of them; which owners exist
    // and which the user's (possibly legacy) role can read comes from the server.
    return hasCapabilities(kibanaCapabilities[FEATURE_ID_V4], capabilities) ? availableOwners : [];
  }

  return Object.entries(kibanaCapabilities).reduce(
    (availableOwners: string[], [featureId, kibanaCapability]) => {
      if (!featureId.endsWith('CasesV3')) {
        return availableOwners;
      }
      if (!hasCapabilities(kibanaCapability, capabilities)) {
        return availableOwners;
      }
      availableOwners.push(getOwnerFromFeatureID(featureId));
      return availableOwners;
    },
    []
  );
};

const hasCapabilities = (
  kibanaCapability: Record<string, unknown> | undefined,
  capabilities: Capability[]
) =>
  kibanaCapability != null &&
  capabilities.every((cap) => !!kibanaCapability[`${cap}_cases`] || !!kibanaCapability[`cases_${cap}`]);

const getOwnerFromFeatureID = (featureID: string) => {
  if (featureID === FEATURE_ID_V3) {
    return APP_ID;
  }

  return featureID.replace('CasesV3', '');
};
