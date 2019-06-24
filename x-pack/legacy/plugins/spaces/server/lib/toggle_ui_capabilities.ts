/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { UICapabilities } from 'ui/capabilities';
import { Feature } from '../../../xpack_main/types';
import { Space } from '../../common/model/space';

export function toggleUICapabilities(
  features: Feature[],
  uiCapabilities: UICapabilities,
  activeSpace: Space
) {
  const clonedCapabilities = _.cloneDeep(uiCapabilities);

  toggleDisabledFeatures(features, clonedCapabilities, activeSpace);

  return clonedCapabilities;
}

function toggleDisabledFeatures(
  features: Feature[],
  uiCapabilities: UICapabilities,
  activeSpace: Space
) {
  const disabledFeatureKeys: string[] = activeSpace.disabledFeatures;

  const disabledFeatures: Feature[] = disabledFeatureKeys
    .map(key => features.find(feature => feature.id === key))
    .filter(feature => typeof feature !== 'undefined') as Feature[];

  const navLinks: Record<string, boolean> = uiCapabilities.navLinks;
  const catalogueEntries: Record<string, boolean> = uiCapabilities.catalogue;
  const managementItems: Record<string, Record<string, boolean>> = uiCapabilities.management;

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
    if (uiCapabilities.hasOwnProperty(feature.id)) {
      const capability = uiCapabilities[feature.id];
      Object.keys(capability).forEach(featureKey => {
        capability[featureKey] = false;
      });
    }
  }
}
