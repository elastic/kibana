/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';

import type {
  Capabilities,
  CapabilitiesSwitcher,
  CoreSetup,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import type { CPSServerSetup } from '@kbn/cps/server';
import type { KibanaFeature } from '@kbn/features-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';

import type { Space } from '../../common';
import { withSpaceSolutionDisabledFeatures } from '../lib/utils/space_solution_disabled_features';
import type { PluginsStart } from '../plugin';
import type { SpacesServiceStart } from '../spaces_service';

export function setupCapabilitiesSwitcher(
  core: CoreSetup<PluginsStart>,
  cps: CPSServerSetup,
  getSpacesService: () => SpacesServiceStart,
  logger: Logger
): CapabilitiesSwitcher {
  return async (request, capabilities, useDefaultCapabilities) => {
    const isAuthRequiredOrOptional = !request.route.options.authRequired;
    const shouldNotToggleCapabilities = isAuthRequiredOrOptional || useDefaultCapabilities;

    if (shouldNotToggleCapabilities) {
      return {};
    }

    try {
      const [activeSpace, [, { features }]] = await Promise.all([
        getSpacesService().getActiveSpace(request),
        core.getStartServices(),
      ]);

      const registeredFeatures = features.getKibanaFeatures();

      // try to retrieve capabilities for authenticated or "maybe authenticated" users
      capabilities = toggleCapabilities(registeredFeatures, capabilities, activeSpace);

      if (cps.getCpsEnabled()) {
        await setProjectRoutingCapabilities(core, request, capabilities);
      }

      return capabilities;
    } catch (e) {
      logger.debug(`Error toggling capabilities for request to ${request.url.pathname}: ${e}`);
      return capabilities;
    }
  };
}

function toggleCapabilities(
  features: KibanaFeature[],
  capabilities: Capabilities,
  activeSpace: Space
) {
  const clonedCapabilities = _.cloneDeep(capabilities);

  toggleDisabledFeatures(features, clonedCapabilities, activeSpace);

  return clonedCapabilities;
}

function toggleDisabledFeatures(
  features: KibanaFeature[],
  capabilities: Capabilities,
  activeSpace: Space
) {
  const disabledFeatureKeys = withSpaceSolutionDisabledFeatures(
    features,
    activeSpace.disabledFeatures,
    activeSpace.solution
  );

  const { enabledFeatures, disabledFeatures } = features.reduce(
    (acc, feature) => {
      if (disabledFeatureKeys.includes(feature.id)) {
        acc.disabledFeatures.push(feature);
      } else if (!feature.deprecated) {
        acc.enabledFeatures.push(feature);
      }
      return acc;
    },
    { enabledFeatures: [], disabledFeatures: [] } as {
      enabledFeatures: KibanaFeature[];
      disabledFeatures: KibanaFeature[];
    }
  );

  const navLinks = capabilities.navLinks;
  const catalogueEntries = capabilities.catalogue;
  const managementItems = capabilities.management;

  const enabledAppEntries = new Set(enabledFeatures.flatMap((ef) => ef.app ?? []));
  const enabledCatalogueEntries = new Set(enabledFeatures.flatMap((ef) => ef.catalogue ?? []));
  const enabledManagementEntries = enabledFeatures.reduce((acc, feature) => {
    const sections = Object.entries(feature.management ?? {});
    sections.forEach((section) => {
      if (!acc.has(section[0])) {
        acc.set(section[0], []);
      }
      acc.get(section[0])!.push(...section[1]);
    });
    return acc;
  }, new Map<string, string[]>());

  for (const feature of disabledFeatures) {
    // Disable associated navLink, if one exists
    feature.app.forEach((app) => {
      if (Object.hasOwn(navLinks, app) && !enabledAppEntries.has(app)) {
        navLinks[app] = false;
      }
    });

    // Disable associated catalogue entries
    const privilegeCatalogueEntries = feature.catalogue || [];
    privilegeCatalogueEntries.forEach((catalogueEntryId) => {
      if (!enabledCatalogueEntries.has(catalogueEntryId)) {
        catalogueEntries[catalogueEntryId] = false;
      }
    });

    // Disable associated management items
    const privilegeManagementSections = feature.management || {};
    Object.entries(privilegeManagementSections).forEach(([sectionId, sectionItems]) => {
      sectionItems.forEach((item) => {
        const enabledManagementEntriesSection = enabledManagementEntries.get(sectionId);
        if (
          Object.hasOwn(managementItems, sectionId) &&
          Object.hasOwn(managementItems[sectionId], item)
        ) {
          const isEnabledElsewhere = (enabledManagementEntriesSection ?? []).includes(item);
          if (!isEnabledElsewhere) {
            managementItems[sectionId][item] = false;
          }
        }
      });
    });

    // Disable "sub features" that match the disabled feature
    if (Object.hasOwn(capabilities, feature.id)) {
      const capability = capabilities[feature.id];
      Object.keys(capability).forEach((featureKey) => {
        capability[featureKey] = false;
      });
    }
  }
}

async function setProjectRoutingCapabilities(
  core: CoreSetup<PluginsStart>,
  request: KibanaRequest,
  capabilities: Capabilities
) {
  const { security } = await core.plugins.onStart<{ security: SecurityPluginStart }>('security');

  if (security.found) {
    const checkPrivileges = security.contract.authz.checkPrivilegesWithRequest(request);
    const response = await checkPrivileges.globally({
      elasticsearch: {
        cluster: ['manage', 'monitor'],
        index: {},
      },
    });

    capabilities.management.kibana!.manage_project_routing =
      response.privileges.elasticsearch.cluster.some(
        (privilege) => privilege.privilege === 'manage' && privilege.authorized
      );

    capabilities.management.kibana!.read_project_routing =
      response.privileges.elasticsearch.cluster.some(
        (privilege) => privilege.privilege === 'monitor' && privilege.authorized
      );
  }
}
