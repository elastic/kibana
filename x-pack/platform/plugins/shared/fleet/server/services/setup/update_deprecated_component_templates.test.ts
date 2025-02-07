/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateDeprecatedComponentTemplates } from './update_deprecated_component_templates';

jest.mock('..', () => ({
  appContextService: {
    getLogger: () => ({
      debug: jest.fn(),
    }),
  },
}));

describe('updateDeprecatedComponentTemplates', () => {
  it('should update deprecated component templates', async () => {
    const esClientMock: any = {
      cluster: {
        getComponentTemplate: jest.fn().mockResolvedValue({
          component_templates: [
            {
              name: 'metrics-apm.app@package',
              component_template: {
                template: {
                  settings: {},
                  mappings: {
                    _source: {
                      mode: 'synthetic',
                    },
                    properties: {},
                  },
                },
              },
            },
            {
              name: 'metricsother',
              component_template: {
                template: {
                  settings: {},
                  mappings: {
                    properties: {},
                  },
                },
              },
            },
          ],
        }),
        putComponentTemplate: jest.fn(),
      },
    };

    await updateDeprecatedComponentTemplates(esClientMock);

    expect(esClientMock.cluster.putComponentTemplate).toHaveBeenCalledTimes(1);
    expect(esClientMock.cluster.putComponentTemplate).toHaveBeenCalledWith({
      body: {
        template: {
          mappings: {
            _source: {},
            properties: {},
          },
          settings: {
            index: {
              mapping: {
                source: {
                  mode: 'synthetic',
                },
              },
            },
          },
        },
      },
      name: 'metrics-apm.app@package',
    });
  });
});
