/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';

import type {
  FeatureKibanaPrivileges,
  FeatureKibanaPrivilegesReference,
} from '@kbn/features-plugin/common';
import type { FeaturesPluginSetup, KibanaFeature } from '@kbn/features-plugin/server';
import {
  getMinimalPrivilegeId,
  isMinimalPrivilegeId,
} from '@kbn/security-authorization-core-common';
import type { RawKibanaPrivileges, SecurityLicense } from '@kbn/security-plugin-types-common';
import { ApiOperation } from '@kbn/security-plugin-types-common';

import { featurePrivilegeBuilderFactory } from './feature_privilege_builder';
import type { Actions } from '../actions';

export interface PrivilegesService {
  get(respectLicenseLevel?: boolean): RawKibanaPrivileges;
}

export function privilegesFactory(
  actions: Actions,
  featuresService: FeaturesPluginSetup,
  licenseService: Pick<SecurityLicense, 'getFeatures' | 'hasAtLeast'>
) {
  const featurePrivilegeBuilder = featurePrivilegeBuilderFactory(actions);

  return {
    get(respectLicenseLevel: boolean = true) {
      const features = featuresService.getKibanaFeatures();
      const { allowSubFeaturePrivileges } = licenseService.getFeatures();
      const { hasAtLeast: licenseHasAtLeast } = licenseService;
      const basePrivilegeFeatures = features.filter(
        (feature) => !feature.excludeFromBasePrivileges
      );

      const allActionsSet = new Set<string>();
      const readActionsSet = new Set<string>();

      basePrivilegeFeatures.forEach((feature) => {
        if (feature.hidden) {
          return;
        }

        for (const { privilegeId, privilege } of featuresService.featurePrivilegeIterator(feature, {
          augmentWithSubFeaturePrivileges: true,
          licenseHasAtLeast,
          predicate: (pId, featurePrivilege) => !featurePrivilege.excludeFromBasePrivileges,
        })) {
          const privilegeActions = featurePrivilegeBuilder.getActions(privilege, feature);
          privilegeActions.forEach((action) => {
            allActionsSet.add(action);
            if (privilegeId === 'read') {
              readActionsSet.add(action);
            }
          });
        }
      });

      // Remember privilege as composable to update it later, once actions for all referenced privileges are also
      // calculated and registered.
      const composablePrivileges: Array<{
        featureId: string;
        privilegeId: string;
        references: readonly FeatureKibanaPrivilegesReference[];
        excludeFromBasePrivileges?: boolean;
        actionsFilter?: (action: string) => boolean;
      }> = [];
      const tryStoreComposablePrivilege = (
        feature: KibanaFeature,
        privilegeId: string,
        privilege: FeatureKibanaPrivileges
      ) => {
        // If privilege is configured with `composedOf` it should be complemented with **all**
        // actions from referenced privileges.
        if (privilege.composedOf) {
          composablePrivileges.push({
            featureId: feature.id,
            privilegeId,
            references: privilege.composedOf,
            excludeFromBasePrivileges:
              feature.excludeFromBasePrivileges || privilege.excludeFromBasePrivileges,
          });
        }

        // If a privilege is configured with `replacedBy`, it's part of the deprecated feature and
        // should be complemented with the subset of actions from the referenced privileges to
        // maintain backward compatibility. Namely, deprecated privileges should grant the same UI
        // capabilities as the privileges that replace them, so that the client-side code can safely
        // use only non-deprecated UI capabilities.
        const replacedBy = getReplacedByForPrivilege(privilegeId, privilege);
        if (replacedBy) {
          composablePrivileges.push({
            featureId: feature.id,
            privilegeId,
            references: replacedBy,
            actionsFilter: (action) => actions.ui.isValid(action),
          });
        }
      };

      const hiddenFeatures = new Set<string>();
      const featurePrivileges: Record<string, Record<string, string[]>> = {};
      for (const feature of features) {
        featurePrivileges[feature.id] = {};
        for (const featurePrivilege of featuresService.featurePrivilegeIterator(feature, {
          augmentWithSubFeaturePrivileges: true,
          licenseHasAtLeast,
        })) {
          const fullPrivilegeId = featurePrivilege.privilegeId;
          featurePrivileges[feature.id][fullPrivilegeId] = [
            actions.login,
            ...uniq(featurePrivilegeBuilder.getActions(featurePrivilege.privilege, feature)),
          ];

          tryStoreComposablePrivilege(feature, fullPrivilegeId, featurePrivilege.privilege);
        }

        for (const featurePrivilege of featuresService.featurePrivilegeIterator(feature, {
          augmentWithSubFeaturePrivileges: false,
          licenseHasAtLeast,
        })) {
          const minimalPrivilegeId = getMinimalPrivilegeId(featurePrivilege.privilegeId);
          featurePrivileges[feature.id][minimalPrivilegeId] = [
            actions.login,
            ...uniq(featurePrivilegeBuilder.getActions(featurePrivilege.privilege, feature)),
          ];

          tryStoreComposablePrivilege(feature, minimalPrivilegeId, featurePrivilege.privilege);
        }

        if (
          (!respectLicenseLevel || allowSubFeaturePrivileges) &&
          feature.subFeatures?.length > 0
        ) {
          for (const subFeaturePrivilege of featuresService.subFeaturePrivilegeIterator(
            feature,
            licenseHasAtLeast
          )) {
            featurePrivileges[feature.id][subFeaturePrivilege.id] = [
              actions.login,
              ...uniq(featurePrivilegeBuilder.getActions(subFeaturePrivilege, feature)),
            ];

            tryStoreComposablePrivilege(feature, subFeaturePrivilege.id, subFeaturePrivilege);
          }
        }

        if (feature.hidden || Object.keys(featurePrivileges[feature.id]).length === 0) {
          hiddenFeatures.add(feature.id);
        }
      }

      // Update composable feature privileges to include and deduplicate actions from the referenced privileges.
      // Note that we should do it _before_ removing hidden features. Also, currently, feature privilege composition
      // doesn't respect the minimum license level required by the feature whose privileges are being included in
      // another feature. This could potentially enable functionality in a license lower than originally intended. It
      // might or might not be desired, but we're accepting this for now, as every attempt to compose a feature
      // undergoes a stringent review process.
      for (const composableFeature of composablePrivileges) {
        const composedActions = composableFeature.references.flatMap((privilegeReference) =>
          privilegeReference.privileges.flatMap((privilege) => {
            const privilegeActions = featurePrivileges[privilegeReference.feature][privilege] ?? [];
            return composableFeature.actionsFilter
              ? privilegeActions.filter(composableFeature.actionsFilter)
              : privilegeActions;
          })
        );
        featurePrivileges[composableFeature.featureId][composableFeature.privilegeId] = [
          ...new Set(
            featurePrivileges[composableFeature.featureId][composableFeature.privilegeId].concat(
              composedActions
            )
          ),
        ];

        if (!composableFeature.excludeFromBasePrivileges) {
          for (const action of composedActions) {
            // Login action is special since it's added explicitly for feature and base privileges.
            if (action === actions.login) {
              continue;
            }

            allActionsSet.add(action);
            if (composableFeature.privilegeId === 'read') {
              readActionsSet.add(action);
            }
          }
        }
      }

      // Remove hidden features to avoid registering standalone privileges for them.
      for (const hiddenFeatureId of hiddenFeatures) {
        delete featurePrivileges[hiddenFeatureId];
      }

      const allActions = [...allActionsSet];
      const readActions = [...readActionsSet];
      return {
        features: featurePrivileges,
        global: {
          all: [
            actions.login,
            actions.api.get(ApiOperation.Read, 'decryptedTelemetry'),
            actions.api.get(ApiOperation.Read, 'features'),
            actions.api.get(ApiOperation.Manage, 'taskManager'),
            actions.api.get(ApiOperation.Manage, 'spaces'),
            actions.space.manage,
            actions.ui.get('spaces', 'manage'),
            actions.ui.get('management', 'kibana', 'spaces'),
            actions.ui.get('catalogue', 'spaces'),
            actions.ui.get('enterpriseSearch', 'all'),
            actions.ui.get('globalSettings', 'save'),
            actions.ui.get('globalSettings', 'show'),
            ...allActions,
          ],
          read: [
            actions.login,
            actions.api.get(ApiOperation.Read, 'decryptedTelemetry'),
            actions.ui.get('globalSettings', 'show'),
            ...readActions,
          ],
        },
        space: {
          all: [actions.login, ...allActions],
          read: [actions.login, ...readActions],
        },
        reserved: features.reduce((acc: Record<string, string[]>, feature: KibanaFeature) => {
          if (feature.reserved) {
            feature.reserved.privileges.forEach((reservedPrivilege) => {
              acc[reservedPrivilege.id] = [
                ...uniq(featurePrivilegeBuilder.getActions(reservedPrivilege.privilege, feature)),
              ];
            });
          }
          return acc;
        }, {}),
      };
    },
  };
}

/**
 * Returns a list of privileges that replace the given privilege, if any. Works for both top-level
 * and sub-feature privileges.
 * @param privilegeId The ID of the privilege to get replacements for.
 * @param privilege The privilege definition to get replacements for.
 */
export function getReplacedByForPrivilege(
  privilegeId: string,
  privilege: FeatureKibanaPrivileges
): readonly FeatureKibanaPrivilegesReference[] | undefined {
  const replacedBy = privilege.replacedBy;
  if (!replacedBy) {
    return;
  }

  // If a privilege of the deprecated feature explicitly defines a replacement for minimal privileges, use it.
  // Otherwise, use the default replacement for all cases.
  return 'minimal' in replacedBy
    ? isMinimalPrivilegeId(privilegeId)
      ? replacedBy.minimal
      : replacedBy.default
    : replacedBy;
}
