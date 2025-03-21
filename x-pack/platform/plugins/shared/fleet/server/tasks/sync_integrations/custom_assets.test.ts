/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findIntegration, getCustomAssets, installCustomAsset } from './custom_assets';

describe('custom assets', () => {
  const integrations = [
    {
      package_name: 'system',
      package_version: '0.1.0',
      updated_at: new Date().toISOString(),
    },
    {
      package_name: 'endpoint',
      package_version: '0.1.0',
      updated_at: new Date().toISOString(),
    },
    {
      package_name: 'synthetics',
      package_version: '0.1.0',
      updated_at: new Date().toISOString(),
    },
  ];

  describe('findIntegration', () => {
    it('should return system integration', () => {
      const integration = findIntegration('logs-system.auth@custom', integrations);
      expect(integration?.package_name).toEqual('system');
    });

    it('should return endpoint integration', () => {
      const integration = findIntegration('endpoint@custom', integrations);
      expect(integration?.package_name).toEqual('endpoint');
    });

    it('should return synthetics integration', () => {
      const integration = findIntegration('synthetics-tcp@custom', integrations);
      expect(integration?.package_name).toEqual('synthetics');
    });

    it('should return undefined', () => {
      const integration = findIntegration('metrics-other.auth@custom', integrations);
      expect(integration).toBeUndefined();
    });
  });

  describe('getCustomAssets', () => {
    let esClientMock: any;

    beforeEach(() => {});

    it('should return custom assets', async () => {
      esClientMock = {
        cluster: {
          getComponentTemplate: jest.fn().mockResolvedValue({
            component_templates: [
              {
                name: 'logs-system.auth@custom',
                component_template: {
                  template: {
                    mappings: {
                      properties: {
                        new_field: {
                          type: 'text',
                        },
                      },
                    },
                  },
                },
              },
              {
                name: 'non-fleet@custom',
                component_template: { template: {} },
              },
            ],
          }),
        },
        ingest: {
          getPipeline: jest.fn().mockResolvedValue({
            'logs-system.auth@custom': {
              processors: [
                {
                  user_agent: {
                    field: 'user_agent',
                  },
                },
              ],
            },
            'non-fleet@custom': {
              processors: [],
            },
          }),
        },
      };

      const customAssets = await getCustomAssets(
        esClientMock,
        integrations,
        new AbortController(),
        undefined
      );

      expect(customAssets).toEqual([
        {
          is_deleted: false,
          name: 'logs-system.auth@custom',
          package_name: 'system',
          package_version: '0.1.0',
          template: {
            mappings: {
              properties: {
                new_field: {
                  type: 'text',
                },
              },
            },
          },
          type: 'component_template',
        },
        {
          is_deleted: false,
          name: 'logs-system.auth@custom',
          package_name: 'system',
          package_version: '0.1.0',
          pipeline: {
            processors: [
              {
                user_agent: {
                  field: 'user_agent',
                },
              },
            ],
          },
          type: 'ingest_pipeline',
        },
      ]);
    });

    it('should set custom assets as deleted', async () => {
      esClientMock = {
        cluster: {
          getComponentTemplate: jest.fn().mockResolvedValue({
            component_templates: [],
          }),
        },
        ingest: {
          getPipeline: jest.fn().mockResolvedValue({}),
        },
      };
      const previousSyncIntegrationsData = {
        remote_es_hosts: [],
        integrations: [],
        custom_assets: {
          'component_template:logs-system.auth@custom': {
            is_deleted: false,
            name: 'logs-system.auth@custom',
            package_name: 'system',
            package_version: '0.1.0',
            template: {},
            type: 'component_template',
          },
        },
      };

      const customAssets = await getCustomAssets(
        esClientMock,
        integrations,
        new AbortController(),
        previousSyncIntegrationsData
      );

      expect(customAssets).toEqual([
        {
          is_deleted: true,
          deleted_at: expect.any(String),
          name: 'logs-system.auth@custom',
          package_name: 'system',
          package_version: '0.1.0',
          template: {},
          type: 'component_template',
        },
      ]);
    });

    it('should remove custom assets if deleted earlier than ttl', async () => {
      esClientMock = {
        cluster: {
          getComponentTemplate: jest.fn().mockResolvedValue({
            component_templates: [],
          }),
        },
        ingest: {
          getPipeline: jest.fn().mockResolvedValue({}),
        },
      };
      const previousSyncIntegrationsData = {
        remote_es_hosts: [],
        integrations: [],
        custom_assets: {
          'component_template:logs-system.auth@custom': {
            is_deleted: true,
            deleted_at: '2025-03-10T09:34:03.683Z',
            name: 'logs-system.auth@custom',
            package_name: 'system',
            package_version: '0.1.0',
            template: {},
            type: 'component_template',
          },
        },
      };

      const customAssets = await getCustomAssets(
        esClientMock,
        integrations,
        new AbortController(),
        previousSyncIntegrationsData
      );

      expect(customAssets).toEqual([]);
    });
  });

  describe('installCustomAsset', () => {
    let esClientMock: any;

    it('should delete component template if deleted', async () => {
      esClientMock = {
        cluster: {
          getComponentTemplate: jest.fn().mockResolvedValue({
            component_templates: [
              {
                name: 'logs-system.auth@custom',
                component_template: {
                  template: {
                    mappings: {
                      properties: {
                        new_field: {
                          type: 'text',
                        },
                      },
                    },
                  },
                },
              },
            ],
          }),
          deleteComponentTemplate: jest.fn().mockResolvedValue({}),
        },
      };

      await installCustomAsset(
        {
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          name: 'logs-system.auth@custom',
          package_name: 'system',
          package_version: '0.1.0',
          template: {},
          type: 'component_template',
        },
        esClientMock,
        new AbortController(),
        { debug: jest.fn() } as any
      );

      expect(esClientMock.cluster.deleteComponentTemplate).toHaveBeenCalledWith(
        {
          name: 'logs-system.auth@custom',
        },
        expect.anything()
      );
    });

    it('should do nothing if component template deleted and not exists', async () => {
      esClientMock = {
        cluster: {
          getComponentTemplate: jest.fn().mockResolvedValue({
            component_templates: [],
          }),
          deleteComponentTemplate: jest.fn().mockResolvedValue({}),
        },
      };

      await installCustomAsset(
        {
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          name: 'logs-system.auth@custom',
          package_name: 'system',
          package_version: '0.1.0',
          template: {},
          type: 'component_template',
        },
        esClientMock,
        new AbortController(),
        { debug: jest.fn() } as any
      );

      expect(esClientMock.cluster.deleteComponentTemplate).not.toHaveBeenCalled();
    });

    it('should install component template if not exists', async () => {
      esClientMock = {
        cluster: {
          getComponentTemplate: jest.fn().mockResolvedValue({
            component_templates: [],
          }),
          putComponentTemplate: jest.fn().mockResolvedValue({}),
        },
      };

      await installCustomAsset(
        {
          is_deleted: false,
          name: 'logs-system.auth@custom',
          package_name: 'system',
          package_version: '0.1.0',
          template: {
            mappings: {
              properties: {
                new_field: {
                  type: 'text',
                },
              },
            },
          },
          type: 'component_template',
        },
        esClientMock,
        new AbortController(),
        { debug: jest.fn() } as any
      );

      expect(esClientMock.cluster.putComponentTemplate).toHaveBeenCalledWith(
        {
          name: 'logs-system.auth@custom',
          template: {
            mappings: {
              properties: {
                new_field: {
                  type: 'text',
                },
              },
            },
          },
        },
        expect.anything()
      );
    });

    it('should update component template if changed', async () => {
      esClientMock = {
        cluster: {
          getComponentTemplate: jest.fn().mockResolvedValue({
            component_templates: [
              {
                name: 'logs-system.auth@custom',
                component_template: {
                  template: {
                    mappings: {
                      properties: {
                        new_field: {
                          type: 'text',
                        },
                      },
                    },
                  },
                },
              },
            ],
          }),
          putComponentTemplate: jest.fn().mockResolvedValue({}),
        },
      };

      await installCustomAsset(
        {
          is_deleted: false,
          name: 'logs-system.auth@custom',
          package_name: 'system',
          package_version: '0.1.0',
          template: {
            mappings: {
              properties: {
                new_field2: {
                  type: 'text',
                },
              },
            },
          },
          type: 'component_template',
        },
        esClientMock,
        new AbortController(),
        { debug: jest.fn() } as any
      );

      expect(esClientMock.cluster.putComponentTemplate).toHaveBeenCalledWith(
        {
          name: 'logs-system.auth@custom',
          template: {
            mappings: {
              properties: {
                new_field2: {
                  type: 'text',
                },
              },
            },
          },
        },
        expect.anything()
      );
    });

    it('should not update component template if not changed', async () => {
      esClientMock = {
        cluster: {
          getComponentTemplate: jest.fn().mockResolvedValue({
            component_templates: [
              {
                name: 'logs-system.auth@custom',
                component_template: {
                  template: {
                    mappings: {
                      properties: {
                        new_field: {
                          type: 'text',
                        },
                      },
                    },
                  },
                },
              },
            ],
          }),
          putComponentTemplate: jest.fn().mockResolvedValue({}),
        },
      };

      await installCustomAsset(
        {
          is_deleted: false,
          name: 'logs-system.auth@custom',
          package_name: 'system',
          package_version: '0.1.0',
          template: {
            mappings: {
              properties: {
                new_field: {
                  type: 'text',
                },
              },
            },
          },
          type: 'component_template',
        },
        esClientMock,
        new AbortController(),
        { debug: jest.fn() } as any
      );

      expect(esClientMock.cluster.putComponentTemplate).not.toHaveBeenCalled();
    });

    // pipeline

    it('should delete ingest pipeline if deleted', async () => {
      esClientMock = {
        ingest: {
          getPipeline: jest.fn().mockResolvedValue({
            'logs-system.auth@custom': {
              processors: [
                {
                  user_agent: {
                    field: 'user_agent',
                  },
                },
              ],
            },
          }),
          deletePipeline: jest.fn().mockResolvedValue({}),
        },
      };

      await installCustomAsset(
        {
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          name: 'logs-system.auth@custom',
          package_name: 'system',
          package_version: '0.1.0',
          processors: [],
          type: 'ingest_pipeline',
        },
        esClientMock,
        new AbortController(),
        { debug: jest.fn() } as any
      );

      expect(esClientMock.ingest.deletePipeline).toHaveBeenCalledWith(
        {
          id: 'logs-system.auth@custom',
        },
        expect.anything()
      );
    });

    it('should do nothing if ingest pipeline deleted and not exists', async () => {
      esClientMock = {
        ingest: {
          getPipeline: jest.fn().mockResolvedValue({}),
          deletePipeline: jest.fn().mockResolvedValue({}),
        },
      };

      await installCustomAsset(
        {
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          name: 'logs-system.auth@custom',
          package_name: 'system',
          package_version: '0.1.0',
          processors: [],
          type: 'ingest_pipeline',
        },
        esClientMock,
        new AbortController(),
        { debug: jest.fn() } as any
      );

      expect(esClientMock.ingest.deletePipeline).not.toHaveBeenCalled();
    });

    it('should install ingest pipeline if not exists', async () => {
      esClientMock = {
        ingest: {
          getPipeline: jest.fn().mockResolvedValue({}),
          putPipeline: jest.fn().mockResolvedValue({}),
        },
      };

      await installCustomAsset(
        {
          is_deleted: false,
          name: 'logs-system.auth@custom',
          package_name: 'system',
          package_version: '0.1.0',
          pipeline: {
            processors: [
              {
                user_agent: {
                  field: 'user_agent',
                },
              },
            ],
            version: 1,
          },
          type: 'ingest_pipeline',
        },
        esClientMock,
        new AbortController(),
        { debug: jest.fn() } as any
      );

      expect(esClientMock.ingest.putPipeline).toHaveBeenCalledWith(
        {
          id: 'logs-system.auth@custom',
          processors: [
            {
              user_agent: {
                field: 'user_agent',
              },
            },
          ],
          version: 1,
        },
        expect.anything()
      );
    });

    it('should update ingest pipeline if version changed', async () => {
      esClientMock = {
        ingest: {
          getPipeline: jest.fn().mockResolvedValue({
            'logs-system.auth@custom': {
              processors: [
                {
                  user_agent: {
                    field: 'user_agent',
                  },
                },
              ],
              version: 1,
            },
          }),
          putPipeline: jest.fn().mockResolvedValue({}),
        },
      };

      await installCustomAsset(
        {
          is_deleted: false,
          name: 'logs-system.auth@custom',
          package_name: 'system',
          package_version: '0.1.0',
          pipeline: {
            processors: [
              {
                user_agent: {
                  field: 'user_agent',
                },
              },
            ],
            version: 2,
          },
          type: 'ingest_pipeline',
        },
        esClientMock,
        new AbortController(),
        { debug: jest.fn() } as any
      );

      expect(esClientMock.ingest.putPipeline).toHaveBeenCalledWith(
        {
          id: 'logs-system.auth@custom',
          processors: [
            {
              user_agent: {
                field: 'user_agent',
              },
            },
          ],
          version: 2,
        },
        expect.anything()
      );
    });

    it('should update ingest pipeline if changed without version', async () => {
      esClientMock = {
        ingest: {
          getPipeline: jest.fn().mockResolvedValue({
            'logs-system.auth@custom': {
              processors: [
                {
                  user_agent: {
                    field: 'user_agent',
                  },
                },
              ],
            },
          }),
          putPipeline: jest.fn().mockResolvedValue({}),
        },
      };

      await installCustomAsset(
        {
          is_deleted: false,
          name: 'logs-system.auth@custom',
          package_name: 'system',
          package_version: '0.1.0',
          pipeline: {
            processors: [
              {
                user_agent: {
                  field: 'user_agent2',
                },
              },
            ],
          },
          type: 'ingest_pipeline',
        },
        esClientMock,
        new AbortController(),
        { debug: jest.fn() } as any
      );

      expect(esClientMock.ingest.putPipeline).toHaveBeenCalledWith(
        {
          id: 'logs-system.auth@custom',
          processors: [
            {
              user_agent: {
                field: 'user_agent2',
              },
            },
          ],
        },
        expect.anything()
      );
    });

    it('should not update ingest pipeline if not changed', async () => {
      esClientMock = {
        ingest: {
          getPipeline: jest.fn().mockResolvedValue({
            'logs-system.auth@custom': {
              processors: [
                {
                  user_agent: {
                    field: 'user_agent',
                  },
                },
              ],
              version: 1,
            },
          }),
          putPipeline: jest.fn().mockResolvedValue({}),
        },
      };

      await installCustomAsset(
        {
          is_deleted: false,
          name: 'logs-system.auth@custom',
          package_name: 'system',
          package_version: '0.1.0',
          pipeline: {
            processors: [
              {
                user_agent: {
                  field: 'user_agent',
                },
              },
            ],
            version: 1,
          },
          type: 'ingest_pipeline',
        },
        esClientMock,
        new AbortController(),
        { debug: jest.fn() } as any
      );

      expect(esClientMock.ingest.putPipeline).not.toHaveBeenCalled();
    });
  });
});
