/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatten, isObject, mapValues } from 'lodash';

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { Capabilities as UICapabilities } from '@kbn/core/types';
import type {
  ElasticsearchFeature,
  FeatureElasticsearchPrivileges,
  KibanaFeature,
} from '@kbn/features-plugin/server';
import type {
  AuthorizationServiceSetup,
  CheckPrivilegesResponse,
} from '@kbn/security-plugin-types-server';
import type { RecursiveReadonly, RecursiveReadonlyArray } from '@kbn/utility-types';

import type { AuthenticatedUser } from '../../common';

export function disableUICapabilitiesFactory(
  request: KibanaRequest,
  features: KibanaFeature[],
  elasticsearchFeatures: ElasticsearchFeature[],
  logger: Logger,
  authz: AuthorizationServiceSetup,
  user: AuthenticatedUser | null
) {
  // nav links are sourced from the apps property.
  // The Kibana Platform associates nav links to the app which registers it, in a 1:1 relationship.
  const featureNavLinkIds = features
    .flatMap((feature) => feature.app)
    .filter((navLinkId) => navLinkId != null);

  const elasticsearchFeatureMap = elasticsearchFeatures.reduce<
    Record<string, RecursiveReadonlyArray<FeatureElasticsearchPrivileges>>
  >((acc, esFeature) => {
    acc[esFeature.id] = esFeature.privileges;
    return acc;
  }, {});

  const allRequiredClusterPrivileges = Array.from(
    new Set(
      Object.values(elasticsearchFeatureMap)
        .flat()
        .map((p) => p.requiredClusterPrivileges)
        .flat()
    )
  );

  const allRequiredIndexPrivileges = Object.values(elasticsearchFeatureMap)
    .flat()
    .filter((p) => !!p.requiredIndexPrivileges)
    .reduce<Record<string, string[]>>((acc, p) => {
      return {
        ...acc,
        ...Object.entries(p.requiredIndexPrivileges!).reduce((acc2, [indexName, privileges]) => {
          acc2[indexName] = [...(acc[indexName] ?? []), ...privileges];
          return acc2;
        }, {} as Record<string, string[]>),
      };
    }, {});

  const isCatalogueItemReferencedByFeatureSet = (
    catalogueEntry: string,
    featureSet: Array<Partial<{ catalogue: RecursiveReadonlyArray<string> | undefined }>>
  ) => {
    return featureSet.some((feature) => (feature.catalogue ?? []).includes(catalogueEntry));
  };

  const shouldAffectCapability = (featureId: keyof UICapabilities, uiCapability: string) => {
    // This method answers: 'Should we affect a capability based on privileges?'

    // 'fileUpload' feature ID is handled independently
    // The spaces and file_upload plugins have their own capabilities switchers.

    // The spaces capabilities switcher handles disabling capabilities within a specific
    // space, but the root 'spaces' feature ID needs to be affected here, where we can check
    // if the current user is privileged to for general spaces capabilities (e.g., manage).

    // Always affect global settings, and the "spaces" feature (see above)
    if (featureId === 'globalSettings' || featureId === 'spaces') {
      return true;
    }

    // If the feature is 'catalogue', return true if it is the 'spaces' capability
    // (we always want to affect that) or if we have a feature that references it
    // (i.e. found in the 'catalogue' property of a registered Kibana or ES feature)
    if (featureId === 'catalogue') {
      return (
        uiCapability === 'spaces' ||
        isCatalogueItemReferencedByFeatureSet(uiCapability, features) ||
        isCatalogueItemReferencedByFeatureSet(uiCapability, elasticsearchFeatures)
      );
    }

    // if the feature is 'navLinks', return true if the nav link was registered
    // (i.e. found in the 'app' property of a registered Kibana feature)
    if (featureId === 'navLinks') {
      return featureNavLinkIds.includes(uiCapability);
    }

    // if the feature is a Kibana feature, return true if it defines privileges
    // (i.e. it adheres to the Kibana security model)
    // Kibana features with no privileges opt out of the Kibana security model and
    // are not subject to our control(e.g.Enterprise Search features)
    const kibanaFeature = features.find((f) => f.id === featureId);
    if (!!kibanaFeature) return !!kibanaFeature.privileges;

    // Lastly return true if the feature is a registered es feature (we always want to affect these),
    // otherwise false(we don't know what this feature is so we don't touch it)
    return !!elasticsearchFeatureMap[featureId];
  };

  const disableAll = (uiCapabilities: UICapabilities) => {
    return mapValues(uiCapabilities, (featureUICapabilities, featureId) =>
      mapValues(featureUICapabilities, (value, uiCapability) => {
        if (typeof value === 'boolean') {
          if (shouldAffectCapability(featureId!, uiCapability!)) {
            return false;
          }
          return value;
        }

        if (isObject(value)) {
          return mapValues(value, () => false);
        }

        throw new Error(`Expected value type of boolean or object, but found ${value}`);
      })
    ) as UICapabilities;
  };

  const usingPrivileges = async (uiCapabilities: UICapabilities) => {
    function getActionsForFeatureCapability(
      featureId: string,
      uiCapability: string,
      value: boolean | Record<string, boolean>
    ): string[] {
      // Capabilities derived from Elasticsearch features should not be
      // included here, as the result is used to check authorization against
      // Kibana Privileges, rather than Elasticsearch Privileges.
      if (Object.hasOwn(elasticsearchFeatureMap, featureId)) {
        return [];
      }
      if (typeof value === 'boolean') {
        return [authz.actions.ui.get(featureId, uiCapability)];
      }
      if (isObject(value)) {
        return Object.keys(value).map((item) =>
          authz.actions.ui.get(featureId, uiCapability, item)
        );
      }
      throw new Error(`Expected value type of boolean or object, but found ${value}`);
    }

    const uiActions = Object.entries(uiCapabilities).reduce<string[]>(
      (acc, [featureId, featureUICapabilities]) => {
        acc.push(
          ...flatten(
            Object.entries(featureUICapabilities).map(([uiCapability, value]) => {
              return getActionsForFeatureCapability(featureId, uiCapability, value);
            })
          )
        );
        return acc;
      },
      []
    );

    let checkPrivilegesResponse: CheckPrivilegesResponse;
    try {
      const checkPrivilegesDynamically = authz.checkPrivilegesDynamicallyWithRequest(request);
      checkPrivilegesResponse = await checkPrivilegesDynamically({
        kibana: uiActions,
        elasticsearch: {
          cluster: allRequiredClusterPrivileges,
          index: allRequiredIndexPrivileges,
        },
      });
    } catch (err) {
      // if we get a 401/403, then we want to disable all uiCapabilities, as this
      // is generally when the user hasn't authenticated yet and we're displaying the
      // login screen, which isn't driven any uiCapabilities
      if (err.statusCode === 401 || err.statusCode === 403) {
        logger.debug(
          `Disabling all uiCapabilities because we received a ${err.statusCode}: ${err.message}`
        );
        return disableAll(uiCapabilities);
      }
      throw err;
    }

    const checkPrivilegesForCapability = (
      enabled: boolean,
      featureId: string,
      ...uiCapabilityParts: string[]
    ) => {
      // if the uiCapability has already been disabled, we don't want to re-enable it
      if (!enabled) {
        return false;
      }

      const action = authz.actions.ui.get(featureId, ...uiCapabilityParts);

      const isElasticsearchFeature = Object.hasOwn(elasticsearchFeatureMap, featureId);
      const isCatalogueFeature = featureId === 'catalogue';
      const isManagementFeature = featureId === 'management';

      if (!isElasticsearchFeature) {
        const hasRequiredKibanaPrivileges = checkPrivilegesResponse.privileges.kibana.some(
          (x) => x.privilege === action && x.authorized === true
        );

        // Catalogue and management capbility buckets can also be influenced by ES privileges,
        // so the early return is not possible for these *unless we have the required Kibana privileges.
        if ((!isCatalogueFeature && !isManagementFeature) || hasRequiredKibanaPrivileges) {
          return hasRequiredKibanaPrivileges;
        }
      }

      return elasticsearchFeatures.some((esFeature) => {
        if (isCatalogueFeature) {
          const [catalogueEntry] = uiCapabilityParts;
          const featureGrantsCatalogueEntry = (esFeature.catalogue ?? []).includes(catalogueEntry);
          return (
            featureGrantsCatalogueEntry &&
            hasAnyRequiredElasticsearchPrivilegesForFeature(
              esFeature,
              checkPrivilegesResponse,
              user
            )
          );
        } else if (isManagementFeature) {
          const [managementSectionId, managementEntryId] = uiCapabilityParts;
          const featureGrantsManagementEntry =
            Object.hasOwn(esFeature.management ?? {}, managementSectionId) &&
            esFeature.management![managementSectionId].includes(managementEntryId);

          return (
            featureGrantsManagementEntry &&
            hasAnyRequiredElasticsearchPrivilegesForFeature(
              esFeature,
              checkPrivilegesResponse,
              user
            )
          );
        } else if (esFeature.id === featureId) {
          if (uiCapabilityParts.length !== 1) {
            // The current privilege system does not allow for this to happen.
            // This is a safeguard against future changes.
            throw new Error(
              `Elasticsearch feature ${esFeature.id} expected a single capability, but found ${uiCapabilityParts.length}`
            );
          }
          return hasRequiredElasticsearchPrivilegesForCapability(
            esFeature,
            uiCapabilityParts[0],
            checkPrivilegesResponse,
            user
          );
        }
      });
    };

    return mapValues(uiCapabilities, (featureUICapabilities, featureId) => {
      return mapValues(
        featureUICapabilities,
        (value: boolean | Record<string, boolean>, uiCapability) => {
          if (typeof value === 'boolean') {
            if (!shouldAffectCapability(featureId!, uiCapability!)) {
              return value;
            }
            return checkPrivilegesForCapability(value, featureId!, uiCapability!);
          }

          if (isObject(value)) {
            const res = mapValues(value, (enabled, subUiCapability) => {
              return checkPrivilegesForCapability(
                enabled,
                featureId!,
                uiCapability!,
                subUiCapability!
              );
            });
            return res;
          }

          throw new Error(
            `Unexpected UI Capability value. Expected boolean or object, but found ${value}`
          );
        }
      );
    }) as UICapabilities;
  };

  return {
    all: disableAll,
    usingPrivileges,
  };
}

function hasRequiredElasticsearchPrivilegesForCapability(
  esFeature: ElasticsearchFeature,
  uiCapability: string,
  checkPrivilegesResponse: CheckPrivilegesResponse,
  user: AuthenticatedUser | null
) {
  return esFeature.privileges.some((privilege) => {
    const privilegeGrantsCapability = privilege.ui.includes(uiCapability);
    if (!privilegeGrantsCapability) {
      return false;
    }

    return isGrantedElasticsearchPrivilege(privilege, checkPrivilegesResponse, user);
  });
}

function hasAnyRequiredElasticsearchPrivilegesForFeature(
  esFeature: ElasticsearchFeature,
  checkPrivilegesResponse: CheckPrivilegesResponse,
  user: AuthenticatedUser | null
) {
  return esFeature.privileges.some((privilege) => {
    return isGrantedElasticsearchPrivilege(privilege, checkPrivilegesResponse, user);
  });
}

function isGrantedElasticsearchPrivilege(
  privilege: RecursiveReadonly<FeatureElasticsearchPrivileges>,
  checkPrivilegesResponse: CheckPrivilegesResponse,
  user: AuthenticatedUser | null
) {
  const hasRequiredClusterPrivileges = privilege.requiredClusterPrivileges.every(
    (expectedClusterPriv) =>
      checkPrivilegesResponse.privileges.elasticsearch.cluster.some(
        (x) => x.privilege === expectedClusterPriv && x.authorized === true
      )
  );

  const hasRequiredIndexPrivileges = Object.entries(privilege.requiredIndexPrivileges ?? {}).every(
    ([indexName, requiredIndexPrivileges]) => {
      return checkPrivilegesResponse.privileges.elasticsearch.index[indexName]
        .filter((indexResponse) => requiredIndexPrivileges.includes(indexResponse.privilege))
        .every((indexResponse) => indexResponse.authorized);
    }
  );

  const hasRequiredRoles = (privilege.requiredRoles ?? []).every(
    (requiredRole) => user?.roles.includes(requiredRole) ?? false
  );

  return hasRequiredClusterPrivileges && hasRequiredIndexPrivileges && hasRequiredRoles;
}
