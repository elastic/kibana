/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { Capabilities } from 'src/core/public';
import { Feature } from '../../../xpack_main/types';
import { Space } from '../../common/model/space';

export function toggleUICapabilities(
  features: Feature[],
  capabilities: Capabilities,
  activeSpace: Space
) {
  const clonedCapabilities = _.cloneDeep(capabilities);

  toggleDisabledFeatures(features, clonedCapabilities, activeSpace);

  return clonedCapabilities;
}

function toggleDisabledFeatures(
  features: Feature[],
  capabilities: Capabilities,
  activeSpace: Space
) {
  const disabledFeatureKeys: string[] = activeSpace.disabledFeatures;

  const disabledFeatures: Feature[] = disabledFeatureKeys
    .map(key => features.find(feature => feature.id === key))
    .filter(feature => typeof feature !== 'undefined') as Feature[];

  const navLinks: Record<string, boolean> = capabilities.navLinks;
  const catalogueEntries: Record<string, boolean> = capabilities.catalogue;
  const managementItems: Record<string, Record<string, boolean>> = capabilities.management;

  for (const feature of disabledFeatures) {
    // Disable associated navLink, if one exists
    if (feature.navLinkId && navLinks.hasOwnProperty(feature.navLinkId)) {
      navLinks[feature.navLinkId] = false;
    }

    // Disable associated catalogue entries
    const privilegeCatalogueEntries: string[] = feature.catalogue || [];
    privilegeCatalogueEntries.forEach(catalogueEntryId => {
      catalogueEntries[catalogueEntryId] = false;
    });

    // Disable associated management items
    const privilegeManagementSections: Record<string, string[]> = feature.management || {};
    Object.entries(privilegeManagementSections).forEach(([sectionId, sectionItems]) => {
      sectionItems.forEach(item => {
        if (
          managementItems.hasOwnProperty(sectionId) &&
          managementItems[sectionId].hasOwnProperty(item)
        ) {
          managementItems[sectionId][item] = false;
        }
      });
    });

    // Disable "sub features" that match the disabled feature
    if (capabilities.hasOwnProperty(feature.id)) {
      const capability = capabilities[feature.id];
      Object.keys(capability).forEach(featureKey => {
        capability[featureKey] = false;
      });
    }
  }
}
