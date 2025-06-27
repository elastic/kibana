/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EnrichedEntityDefinitionsResponse,
  EntityDefinitionsResponse,
  ObservabilityDynamicNavigation,
} from '../../../../common/types';

export async function enrichEntityDefinitions(
  entityDefinitions: EntityDefinitionsResponse[],
  navigation: ObservabilityDynamicNavigation[]
): Promise<EnrichedEntityDefinitionsResponse[]> {
  const navigationItemsMap = new Map<string, ObservabilityDynamicNavigation>();

  for (const item of navigation) {
    if (item.entityId) {
      navigationItemsMap.set(item.entityId, item);
    }
    for (const subItem of item.subItems ?? []) {
      if (subItem.entityId) {
        navigationItemsMap.set(subItem.entityId, subItem);
      }
    }
  }

  return entityDefinitions.map((definition) => {
    const navigationItem = navigationItemsMap.get(definition.id);

    if (navigationItem) {
      return {
        ...definition,
        navigation: {
          id: navigationItem.id,
          entityId: navigationItem.entityId,
          title: navigationItem.title,
          dashboardId: navigationItem.dashboardId,
          href: navigationItem.href,
        },
      };
    }
    return definition;
  });
}
