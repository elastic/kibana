/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { registerFeatures } from './register_features';
import { PLUGIN_ID } from '../../common';
import {
  packSavedObjectType,
  packAssetSavedObjectType,
  savedQuerySavedObjectType,
} from '../../common/types';

describe('registerFeatures', () => {
  it('registers osquery feature with expected privileges', () => {
    const features = featuresPluginMock.createSetup();

    registerFeatures(features);

    expect(features.registerKibanaFeature).toHaveBeenCalledTimes(1);

    const feature = features.registerKibanaFeature.mock.calls[0][0];

    expect(feature).toMatchObject({
      id: PLUGIN_ID,
      category: DEFAULT_APP_CATEGORIES.management,
      app: [PLUGIN_ID, 'kibana'],
      catalogue: [PLUGIN_ID],
      privileges: {
        all: {
          api: [`${PLUGIN_ID}-read`, `${PLUGIN_ID}-write`],
          ui: ['read', 'write'],
        },
        read: {
          api: [`${PLUGIN_ID}-read`],
          ui: ['read'],
        },
      },
    });

    const subFeatures = feature.subFeatures ?? [];
    const savedQueriesSubFeature = subFeatures.find(
      (subFeature: { name: string }) => subFeature.name === 'Saved queries'
    );
    const packsSubFeature = subFeatures.find(
      (subFeature: { name: string }) => subFeature.name === 'Packs'
    );

    expect(savedQueriesSubFeature?.privilegeGroups[0].privileges[0].savedObject.all).toEqual([
      savedQuerySavedObjectType,
    ]);
    expect(packsSubFeature?.privilegeGroups[0].privileges[0].savedObject.all).toEqual([
      packSavedObjectType,
      packAssetSavedObjectType,
    ]);
  });
});
