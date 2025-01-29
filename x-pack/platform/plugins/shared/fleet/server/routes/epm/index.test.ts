/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';

import type { FleetRequestHandlerContext } from '../..';

import { xpackMocks } from '../../mocks';
import {
  ElasticsearchAssetType,
  KibanaSavedObjectType,
  INSTALL_STATES,
} from '../../../common/types';

import type {
  GetInfoResponse,
  InstallPackageResponse,
  GetCategoriesResponse,
  GetPackagesResponse,
  GetLimitedPackagesResponse,
  BulkInstallPackageInfo,
  BulkInstallPackagesResponse,
  GetStatsResponse,
  UpdatePackageResponse,
  GetBulkAssetsResponse,
  GetInstalledPackagesResponse,
  GetEpmDataStreamsResponse,
  PackageListItem,
  TemplateAgentPolicyInput,
  InstallationInfo,
  InstallableSavedObject,
  PackageInfo,
  AssetsGroupedByServiceByType,
} from '../../../common/types';

import {
  GetCategoriesResponseSchema,
  GetPackagesResponseSchema,
  GetInstalledPackagesResponseSchema,
  GetLimitedPackagesResponseSchema,
  GetStatsResponseSchema,
  GetInputsResponseSchema,
  GetInfoResponseSchema,
  UpdatePackageResponseSchema,
  InstallPackageResponseSchema,
  InstallKibanaAssetsResponseSchema,
  BulkInstallPackagesFromRegistryResponseSchema,
  GetDataStreamsResponseSchema,
  GetBulkAssetsResponseSchema,
  ReauthorizeTransformResponseSchema,
} from '../../types';

import {
  getCategoriesHandler,
  getListHandler,
  getInstalledListHandler,
  getLimitedListHandler,
  getInfoHandler,
  getBulkAssetsHandler,
  installPackageFromRegistryHandler,
  bulkInstallPackagesFromRegistryHandler,
  getStatsHandler,
  updatePackageHandler,
  reauthorizeTransformsHandler,
  getDataStreamsHandler,
  getInputsHandler,
} from './handlers';

import { installPackageKibanaAssetsHandler } from './kibana_assets_handler';

jest.mock('./handlers', () => ({
  ...jest.requireActual('./handlers'),
  getCategoriesHandler: jest.fn(),
  getListHandler: jest.fn(),
  getInstalledListHandler: jest.fn(),
  getLimitedListHandler: jest.fn(),
  getInfoHandler: jest.fn(),
  getBulkAssetsHandler: jest.fn(),
  installPackageFromRegistryHandler: jest.fn(),
  installPackageByUploadHandler: jest.fn(),
  deletePackageHandler: jest.fn(),
  bulkInstallPackagesFromRegistryHandler: jest.fn(),
  getStatsHandler: jest.fn(),
  updatePackageHandler: jest.fn(),
  getVerificationKeyIdHandler: jest.fn(),
  reauthorizeTransformsHandler: jest.fn(),
  getDataStreamsHandler: jest.fn(),
  createCustomIntegrationHandler: jest.fn(),
  getInputsHandler: jest.fn(),
}));

jest.mock('./kibana_assets_handler', () => ({
  installPackageKibanaAssetsHandler: jest.fn(),
}));

describe('schema validation', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let installationInfo: InstallationInfo;
  let savedObject: InstallableSavedObject;
  let packageInfo: PackageInfo;

  beforeEach(() => {
    context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
    response = httpServerMock.createResponseFactory();
    installationInfo = {
      type: 'type',
      created_at: 'now',
      updated_at: 'now',
      namespaces: ['default'],
      installed_kibana: [
        {
          id: 'id',
          originId: 'originId',
          type: KibanaSavedObjectType.dashboard,
        },
      ],
      installed_es: [
        {
          id: 'id',
          type: ElasticsearchAssetType.ingestPipeline,
          deferred: true,
        },
      ],
      name: 'name',
      version: '1.0.0',
      install_status: 'installed',
      install_source: 'registry',
      verification_status: 'unverified',
      additional_spaces_installed_kibana: {
        test: [
          {
            id: 'id',
            originId: 'originId',
            type: KibanaSavedObjectType.dashboard,
          },
        ],
      },
      installed_kibana_space_id: 'space',
      install_format_schema_version: '1.0.0',
      verification_key_id: null,
      experimental_data_stream_features: [
        {
          data_stream: 'data_stream',
          features: {
            tsdb: true,
          },
        },
      ],
      latest_install_failed_attempts: [
        {
          created_at: 'now',
          target_version: '1.0.0',
          error: {
            message: 'message',
            name: 'name',
            stack: 'stack',
          },
        },
      ],
      latest_executed_state: {
        name: INSTALL_STATES.CREATE_RESTART_INSTALLATION,
        started_at: 'now',
        error: 'error',
      },
    };
    savedObject = {
      type: 'type',
      id: 'id',
      attributes: {
        installed_kibana: [],
        installed_es: [],
        name: 'name',
        version: '1',
        install_status: 'installed',
        install_version: '1',
        install_started_at: 'date',
        install_source: 'registry',
        verification_status: 'unverified',
        es_index_patterns: {},
      },
    };
    const assets: AssetsGroupedByServiceByType = {
      kibana: {
        dashboard: [],
        visualization: [],
        search: [],
        lens: [],
        map: [],
        index_pattern: [],
        ml_module: [],
        security_ai_prompt: [],
        security_rule: [],
        tag: [],
        csp_rule_template: [],
        osquery_pack_asset: [],
        osquery_saved_query: [],
      },
      elasticsearch: {
        index_template: [],
        component_template: [],
        ilm_policy: [],
        transform: [],
        ingest_pipeline: [],
        data_stream_ilm_policy: [],
        ml_model: [],
      },
    };
    packageInfo = {
      installationInfo,
      status: 'installed',
      savedObject,
      name: 'test',
      version: '1.0.0',
      description: 'test',
      format_version: '1.0.0',
      owner: { github: 'test', type: 'elastic' },
      title: 'title',
      latestVersion: '1.0.0',
      assets,
      path: 'path',
      download: 'download',
      license: 'basic',
      source: {
        license: 'basic',
      },
      type: 'integration',
      release: 'ga',
      categories: ['advanced_analytics_ueba'],
      conditions: {
        kibana: {
          version: '1.0.0',
        },
        elastic: {
          subscription: 'basic',
          capabilities: ['test'],
        },
      },
      icons: [
        {
          src: 'src',
          title: 'title',
          size: 'size',
          type: 'type',
          path: 'path',
        },
      ],
      screenshots: [
        {
          src: 'src',
          title: 'title',
          size: 'size',
          type: 'type',
          path: 'path',
        },
      ],
      policy_templates: [
        {
          name: 'name',
          title: 'title',
          description: 'description',
          inputs: [],
          multiple: false,
        },
      ],
      vars: [
        {
          name: 'name',
          title: 'title',
          type: 'text',
          description: 'description',
          required: true,
          show_user: true,
          multi: false,
          options: [],
          os: {},
        },
      ],
      elasticsearch: {
        'index_template.settings': {},
        'index_template.mappings': {},
        'index_template.data_stream': {},
      },
      agent: {
        privileges: {
          root: true,
        },
      },
      asset_tags: [
        {
          text: 'text',
          asset_types: ['type'],
          asset_ids: ['id'],
        },
      ],
      readme: 'readme',
      internal: false,
      data_streams: [
        {
          type: 'type',
          dataset: 'dataset',
          title: 'title',
          release: 'ga',
          ingest_pipeline: 'pipeline',
          package: 'package',
          path: 'path',
        },
      ],
      signature_path: 'path',
    };
  });

  it('get categories should return valid response', async () => {
    const category = {
      id: 'test',
      title: 'test',
      count: 0,
      parent_id: '1',
      parent_title: 'title',
    };
    const expectedResponse: GetCategoriesResponse = {
      items: [category],
    };
    (getCategoriesHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await getCategoriesHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetCategoriesResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('get packages should return valid response', async () => {
    const packageItem: PackageListItem = {
      id: 'test',
      integration: 'test',
      installationInfo,
      status: 'installed',
      name: 'name',
      title: 'title',
      version: '1.0.0',
      release: 'ga',
      description: 'description',
      type: 'integration',
      download: 'download',
      path: 'path',
      icons: [
        {
          src: 'src',
          title: 'title',
          size: 'size',
          type: 'type',
          path: 'path',
        },
      ],
      internal: false,
      data_streams: [
        {
          type: 'type',
          dataset: 'dataset',
          title: 'title',
          release: 'ga',
          ingest_pipeline: 'pipeline',
          package: 'package',
          path: 'path',
        },
      ],
      policy_templates: [
        {
          name: 'name',
          title: 'title',
          description: 'description',
          inputs: [],
          multiple: false,
        },
      ],
      categories: ['advanced_analytics_ueba'],
      savedObject,
    };
    const expectedResponse: GetPackagesResponse = {
      items: [packageItem],
    };
    (getListHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await getListHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetPackagesResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('get installed packages should return valid response', async () => {
    const expectedResponse: GetInstalledPackagesResponse = {
      items: [
        {
          name: 'test',
          version: '1.0.0',
          status: 'installed',
          dataStreams: [
            {
              name: 'test',
              title: 'test',
            },
          ],
          title: 'test',
          description: 'test',
          icons: [
            {
              src: 'src',
              title: 'title',
              size: 'size',
              type: 'type',
              dark_mode: true,
            },
          ],
        },
      ],
      total: 1,
      searchAfter: ['test'],
    };
    (getInstalledListHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await getInstalledListHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetInstalledPackagesResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('get limited packages should return valid response', async () => {
    const expectedResponse: GetLimitedPackagesResponse = {
      items: ['test'],
    };
    (getLimitedListHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await getLimitedListHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetLimitedPackagesResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('get stats should return valid response', async () => {
    const expectedResponse: GetStatsResponse = {
      response: {
        agent_policy_count: 0,
      },
    };
    (getStatsHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await getStatsHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetStatsResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('get inputs template should return valid response', async () => {
    const expectedResponse: { inputs: TemplateAgentPolicyInput[] } = {
      inputs: [
        {
          id: 'test',
          type: 'test',
          streams: [
            {
              id: 'test',
              data_stream: {
                dataset: 'test',
                type: 'test',
              },
              extra: 'test',
            },
          ],
        },
      ],
    };
    (getInputsHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await getInputsHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetInputsResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('get package info should return valid response', async () => {
    const expectedResponse: GetInfoResponse = {
      item: packageInfo,
      metadata: {
        has_policies: true,
      },
    };
    (getInfoHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await getInfoHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetInfoResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('update package should return valid response', async () => {
    const expectedResponse: UpdatePackageResponse = {
      item: packageInfo,
    };
    (updatePackageHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await updatePackageHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = UpdatePackageResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('install package from registry should return valid response', async () => {
    const expectedResponse: InstallPackageResponse = {
      items: [
        {
          id: 'test',
          type: KibanaSavedObjectType.dashboard,
          originId: 'test',
        },
      ],
      _meta: {
        install_source: 'registry',
      },
    };
    (installPackageFromRegistryHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await installPackageFromRegistryHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = InstallPackageResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('install package kibana assets should return valid response', async () => {
    const expectedResponse = {
      success: true,
    };
    (installPackageKibanaAssetsHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await installPackageKibanaAssetsHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = InstallKibanaAssetsResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('bulk install package from registry should return valid response', async () => {
    const item: BulkInstallPackageInfo = {
      name: 'test',
      version: '1.0.0',
      result: {
        assets: [
          {
            id: 'test',
            type: KibanaSavedObjectType.dashboard,
            originId: 'test',
          },
        ],
        status: 'installed',
        error: new Error('test'),
        installType: 'reinstall',
        installSource: 'registry',
      },
    };
    const expectedResponse: BulkInstallPackagesResponse = {
      items: [item, { name: 'test', statusCode: 400, error: 'test' }],
    };
    (bulkInstallPackagesFromRegistryHandler as jest.Mock).mockImplementation(
      (ctx, request, res) => {
        return res.ok({ body: expectedResponse });
      }
    );
    await bulkInstallPackagesFromRegistryHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = BulkInstallPackagesFromRegistryResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('get data streams should return valid response', async () => {
    const expectedResponse: GetEpmDataStreamsResponse = {
      items: [{ name: 'test' }],
    };
    (getDataStreamsHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await getDataStreamsHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetDataStreamsResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('get bulk assets should return valid response', async () => {
    const expectedResponse: GetBulkAssetsResponse = {
      items: [
        {
          id: 'test',
          type: KibanaSavedObjectType.dashboard,
          updatedAt: 'now',
          appLink: 'link',
          attributes: {
            service: 'test',
            title: 'test',
            description: 'test',
          },
        },
      ],
    };
    (getBulkAssetsHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await getBulkAssetsHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetBulkAssetsResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('reauthorize transforms should return valid response', async () => {
    const expectedResponse: Array<{ transformId: string; success: boolean; error: null | any }> = [
      {
        transformId: 'test',
        success: true,
        error: null,
      },
      {
        transformId: 'test2',
        success: false,
        error: 'error',
      },
    ];
    (reauthorizeTransformsHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await reauthorizeTransformsHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = ReauthorizeTransformResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });
});
