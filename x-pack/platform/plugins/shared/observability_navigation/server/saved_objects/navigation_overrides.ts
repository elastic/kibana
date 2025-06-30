/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, SavedObjectsClient, SavedObjectsType } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { DynamicNavigationItem, ObservabilityDynamicNavigation } from '../../common/types';
import { OBSERVABILITY_NAVIGATION_OVERRIDES } from '../../common/saved_object_contants';

export interface NavigationOverridesSavedObject {
  navigation: Array<
    Omit<ObservabilityDynamicNavigation, 'subItems'> & {
      subItems?: Array<Omit<DynamicNavigationItem, 'sanitizedTitle'>>;
    }
  >;
}

const observabilityNavigationOverridesItemMapping: SavedObjectsType['mappings']['properties'] = {
  id: {
    type: 'keyword',
  },
  title: {
    type: 'keyword',
  },
  entityType: {
    type: 'keyword',
  },
  dashboardId: {
    type: 'keyword',
  },
  order: {
    type: 'keyword',
  },
};

const observabilityNavigationOverridesMapping: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    navigation: {
      type: 'nested',
      dynamic: false,
      properties: {
        ...observabilityNavigationOverridesItemMapping,
        subItems: {
          type: 'nested',
          dynamic: false,
          properties: observabilityNavigationOverridesItemMapping,
        },
      },
    },
  },
};

export const navigationOverrides: SavedObjectsType = {
  name: OBSERVABILITY_NAVIGATION_OVERRIDES,
  hidden: false,
  namespaceType: 'multiple',
  mappings: observabilityNavigationOverridesMapping,
  management: {
    importableAndExportable: true,
    icon: 'apmApp',
    getTitle: () =>
      i18n.translate('xpack.observabilityNavigation.overrides.title', {
        defaultMessage: 'Observability navigation overrides',
      }),
  },
};

export async function createNavigationOverrides(core: CoreSetup) {
  const [coreStart] = await core.getStartServices();

  const savedObjectsClient = new SavedObjectsClient(
    coreStart.savedObjects.createInternalRepository()
  );

  await Promise.all([
    savedObjectsClient.create<NavigationOverridesSavedObject>(
      OBSERVABILITY_NAVIGATION_OVERRIDES,
      {
        navigation: [
          {
            id: 'kubernetes',
            title: 'Kubernetes',
            subItems: [
              {
                id: 'volume',
                title: 'Volumes',
                order: 500,
                dashboardId: 'kubernetes-3912d9a0-bcb2-11ec-b64f-7dd6e8e82013',
              },
              {
                id: 'dashboard',
                title: 'Services',
                order: 800,
                dashboardId: 'kubernetes-ff1b3850-bcb1-11ec-b64f-7dd6e8e82013',
              },
            ],
          },
        ],
      },
      {
        id: 'kubernetes',
        overwrite: true,
      }
    ),
    savedObjectsClient.create<NavigationOverridesSavedObject>(
      OBSERVABILITY_NAVIGATION_OVERRIDES,
      {
        navigation: [
          {
            id: 'docker',
            title: 'Docker',
            dashboardId: 'kubernetes_otel-cluster-overview',
          },
        ],
      },
      {
        id: 'docker',
        overwrite: true,
      }
    ),
  ]);
}
