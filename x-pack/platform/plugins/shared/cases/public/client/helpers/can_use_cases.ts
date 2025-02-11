/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import {
  FEATURE_ID_V3,
  GENERAL_CASES_OWNER,
  OBSERVABILITY_OWNER,
  SECURITY_SOLUTION_OWNER,
} from '../../../common/constants';
import { getUICapabilities } from './capabilities';
import type { CasesPermissions } from '../../../common';

export type CasesOwners =
  | typeof SECURITY_SOLUTION_OWNER
  | typeof OBSERVABILITY_OWNER
  | typeof GENERAL_CASES_OWNER;

/*
 * Returns an object denoting the current user's ability to read and crud cases.
 * If any owner(securitySolution, Observability) is found with crud or read capability respectively,
 * then crud or read is set to true.
 * Permissions for a specific owners can be found by passing an owner array
 */
export const canUseCases =
  (capabilities: Partial<ApplicationStart['capabilities']>) =>
  (
    owners: CasesOwners[] = [OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER, GENERAL_CASES_OWNER]
  ): CasesPermissions => {
    const aggregatedPermissions = owners.reduce<CasesPermissions>(
      // eslint-disable-next-line complexity
      (acc, owner) => {
        const userCapabilitiesForOwner = getUICapabilities(capabilities[getFeatureID(owner)]);
        acc.create = acc.create || userCapabilitiesForOwner.create;
        acc.read = acc.read || userCapabilitiesForOwner.read;
        acc.update = acc.update || userCapabilitiesForOwner.update;
        acc.delete = acc.delete || userCapabilitiesForOwner.delete;
        acc.push = acc.push || userCapabilitiesForOwner.push;
        acc.connectors = acc.connectors || userCapabilitiesForOwner.connectors;
        acc.settings = acc.settings || userCapabilitiesForOwner.settings;
        acc.reopenCase = acc.reopenCase || userCapabilitiesForOwner.reopenCase;
        acc.createComment = acc.createComment || userCapabilitiesForOwner.createComment;
        acc.assign = acc.assign || userCapabilitiesForOwner.assign;

        const allFromAcc =
          acc.create &&
          acc.read &&
          acc.update &&
          acc.delete &&
          acc.push &&
          acc.connectors &&
          acc.settings &&
          acc.reopenCase &&
          acc.createComment &&
          acc.assign;

        acc.all = acc.all || userCapabilitiesForOwner.all || allFromAcc;

        return acc;
      },
      {
        all: false,
        create: false,
        read: false,
        update: false,
        delete: false,
        push: false,
        connectors: false,
        settings: false,
        reopenCase: false,
        createComment: false,
        assign: false,
      }
    );

    return {
      ...aggregatedPermissions,
    };
  };

const getFeatureID = (owner: CasesOwners) => {
  if (owner === GENERAL_CASES_OWNER) {
    return FEATURE_ID_V3;
  }

  return `${owner}CasesV3`;
};
