/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { typeToPathMap } from '@elastic/eui/lib/components/icon/icon_map';
import { TypeRegistry } from '@kbn/alerts-ui-shared/lib';
import type { ActionTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import type { TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';
import { registerConnectorTypes } from '.';
import { experimentalFeaturesMock } from '../mocks';
import { ExperimentalFeaturesService } from '../common/experimental_features_service';

beforeAll(() => {
  ExperimentalFeaturesService.init({ experimentalFeatures: experimentalFeaturesMock });
});

const registerAll = () => {
  const connectorTypeRegistry = new TypeRegistry<ActionTypeModel>();
  registerConnectorTypes({
    connectorTypeRegistry:
      connectorTypeRegistry as unknown as TriggersAndActionsUIPublicPluginSetup['actionTypeRegistry'],
    services: { validateEmailAddresses: () => [] },
  });
  return connectorTypeRegistry;
};

const EUI_GLYPHS = new Set(Object.keys(typeToPathMap));

describe('registerConnectorTypes', () => {
  // `iconClass` is typed `IconType`, which permits any string because EuiIcon treats
  // an unrecognized one as an image URL — a typo renders a broken `<img>` instead of
  // failing the build. `typeToPathMap` is the real glyph list; names that only appear
  // in EUI's `typeToPathMapSynonyms` (e.g. `email`) are search aliases, not glyphs.
  it('registers every connector with a valid EUI glyph as iconClass', () => {
    const invalid = registerAll()
      .list()
      .filter(({ iconClass }) => typeof iconClass === 'string' && !EUI_GLYPHS.has(iconClass))
      .map(({ id, iconClass }) => `${id} -> ${String(iconClass)}`);

    expect(invalid).toEqual([]);
  });
});
