/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ManagementAppLocatorDefinition } from '@kbn/management-plugin/common/locator';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { ALERTING_V2_RULE_LIBRARY_LOCATOR } from '@kbn/alerting-v2-constants';
import { AlertingV2RuleLibraryLocatorDefinition } from './locator';

describe('Alerting v2 rule library locator', () => {
  const setup = () => {
    const managementDefinition = new ManagementAppLocatorDefinition();
    const definition = new AlertingV2RuleLibraryLocatorDefinition({
      managementAppLocator: {
        ...sharePluginMock.createLocator(),
        getLocation: (params) => managementDefinition.getLocation(params),
        getUrl: async () => {
          throw new Error('not implemented');
        },
        navigate: async () => {
          throw new Error('not implemented');
        },
        useUrl: () => '',
      },
    });
    return { definition };
  };

  it('uses the rule library locator id', () => {
    const { definition } = setup();
    expect(definition.id).toBe(ALERTING_V2_RULE_LIBRARY_LOCATOR);
  });

  it('generates the rule library location without a templateId', async () => {
    const { definition } = setup();
    const location = await definition.getLocation({});

    expect(location).toMatchObject({
      app: 'management',
      path: '/alertingV2/rule_library',
    });
  });

  it('appends templateId as a query param', async () => {
    const { definition } = setup();
    const location = await definition.getLocation({
      templateId: 'template-2',
    });

    expect(location).toMatchObject({
      app: 'management',
      path: '/alertingV2/rule_library?templateId=template-2',
    });
  });

  it('encodes templateId query values', async () => {
    const { definition } = setup();
    const location = await definition.getLocation({
      templateId: 'template/with spaces',
    });

    expect(location.path).toBe('/alertingV2/rule_library?templateId=template%2Fwith%20spaces');
  });
});
