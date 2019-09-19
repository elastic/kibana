/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { Server } from 'hapi';
import { Legacy } from 'kibana';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchServiceMock, coreMock } from 'src/core/server/mocks';
import { SavedObjectsSchema, SavedObjectsService } from 'src/core/server';
import { Readable } from 'stream';
import { createPromiseFromStreams, createConcatStream } from 'src/legacy/utils/streams';
import { createOptionalPlugin } from '../../../../../../server/lib/optional_plugin';
import { SpacesClient } from '../../../lib/spaces_client';
import { createSpaces } from './create_spaces';
import { ExternalRouteDeps } from '../external';
import { SpacesService } from '../../../new_platform/spaces_service';
import { SpacesAuditLogger } from '../../../lib/audit_logger';
import { InternalRouteDeps } from '../v1';
import { LegacyAPI } from '../../../new_platform/plugin';

interface KibanaServer extends Legacy.Server {
  savedObjects: any;
}

export interface TestConfig {
  [configKey: string]: any;
}

export interface TestOptions {
  setupFn?: (server: any) => void;
  testConfig?: TestConfig;
  payload?: any;
  preCheckLicenseImpl?: (req: any, h: any) => any;
  expectSpacesClientCall?: boolean;
  expectPreCheckLicenseCall?: boolean;
}

export type TeardownFn = () => void;

export interface RequestRunnerResult {
  server: any;
  mockSavedObjectsRepository: any;
  mockSavedObjectsService: {
    getScopedSavedObjectsClient: jest.Mock<SavedObjectsService['getScopedSavedObjectsClient']>;
    importExport: {
      getSortedObjectsForExport: jest.Mock<
        SavedObjectsService['importExport']['getSortedObjectsForExport']
      >;
      importSavedObjects: jest.Mock<SavedObjectsService['importExport']['importSavedObjects']>;
      resolveImportErrors: jest.Mock<SavedObjectsService['importExport']['resolveImportErrors']>;
    };
  };
  headers: Record<string, unknown>;
  response: any;
}

export type RequestRunner = (
  method: string,
  path: string,
  options?: TestOptions
) => Promise<RequestRunnerResult>;

export const defaultPreCheckLicenseImpl = (request: any) => '';

const baseConfig: TestConfig = {
  'server.basePath': '',
};

async function readStreamToCompletion(stream: Readable) {
  return (createPromiseFromStreams([stream, createConcatStream([])]) as unknown) as any[];
}

export function createTestHandler(
  initApiFn: (deps: ExternalRouteDeps & InternalRouteDeps) => void
) {
  const teardowns: TeardownFn[] = [];

  const spaces = createSpaces();

  const request: RequestRunner = async (
    method: string,
    path: string,
    options: TestOptions = {}
  ) => {
    const {
      setupFn = () => {
        return;
      },
      testConfig = {},
      payload,
      preCheckLicenseImpl = defaultPreCheckLicenseImpl,
      expectPreCheckLicenseCall = true,
      expectSpacesClientCall = true,
    } = options;

    let pre = jest.fn();
    if (preCheckLicenseImpl) {
      pre = pre.mockImplementation(preCheckLicenseImpl);
    }

    const server = new Server() as KibanaServer;

    const config = {
      ...baseConfig,
      ...testConfig,
    };

    await setupFn(server);

    const mockConfig = {
      get: (key: string) => config[key],
    };

    server.decorate('server', 'config', jest.fn<any, any>(() => mockConfig));

    const mockSavedObjectsClientContract = {
      get: jest.fn((type, id) => {
        const result = spaces.filter(s => s.id === id);
        if (!result.length) {
          throw new Error(`not found: [${type}:${id}]`);
        }
        return result[0];
      }),
      find: jest.fn(() => {
        return {
          total: spaces.length,
          saved_objects: spaces,
        };
      }),
      create: jest.fn((type, attributes, { id }) => {
        if (spaces.find(s => s.id === id)) {
          throw new Error('conflict');
        }
        return {};
      }),
      update: jest.fn((type, id) => {
        if (!spaces.find(s => s.id === id)) {
          throw new Error('not found: during update');
        }
        return {};
      }),
      delete: jest.fn((type: string, id: string) => {
        return {};
      }),
      deleteByNamespace: jest.fn(),
    };

    server.savedObjects = {
      types: ['visualization', 'dashboard', 'index-pattern', 'globalType'],
      schema: new SavedObjectsSchema({
        space: {
          isNamespaceAgnostic: true,
          hidden: true,
        },
        globalType: {
          isNamespaceAgnostic: true,
        },
      }),
      getScopedSavedObjectsClient: jest.fn().mockResolvedValue(mockSavedObjectsClientContract),
      importExport: {
        getSortedObjectsForExport: jest.fn().mockResolvedValue(
          new Readable({
            objectMode: true,
            read() {
              if (Array.isArray(payload.objects)) {
                payload.objects.forEach((o: any) => this.push(o));
              }
              this.push(null);
            },
          })
        ),
        importSavedObjects: jest.fn().mockImplementation(async (opts: Record<string, any>) => {
          const objectsToImport: any[] = await readStreamToCompletion(opts.readStream);
          return {
            success: true,
            successCount: objectsToImport.length,
          };
        }),
        resolveImportErrors: jest.fn().mockImplementation(async (opts: Record<string, any>) => {
          const objectsToImport: any[] = await readStreamToCompletion(opts.readStream);
          return {
            success: true,
            successCount: objectsToImport.length,
          };
        }),
      },
      SavedObjectsClient: {
        errors: {
          isNotFoundError: jest.fn((e: any) => e.message.startsWith('not found:')),
          isConflictError: jest.fn((e: any) => e.message.startsWith('conflict')),
        },
      },
    };

    server.plugins.elasticsearch = {
      createCluster: jest.fn(),
      waitUntilReady: jest.fn(),
      getCluster: jest.fn().mockReturnValue({
        callWithRequest: jest.fn(),
        callWithInternalUser: jest.fn(),
      }),
    };

    const log = {
      log: jest.fn(),
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    };

    const coreSetupMock = coreMock.createSetup();

    const legacyAPI = {
      legacyConfig: {
        serverBasePath: mockConfig.get('server.basePath'),
        serverDefaultRoute: mockConfig.get('server.defaultRoute'),
      },
      savedObjects: server.savedObjects,
    } as LegacyAPI;

    const service = new SpacesService(log, () => legacyAPI);
    const spacesService = await service.setup({
      http: coreSetupMock.http,
      elasticsearch: elasticsearchServiceMock.createSetupContract(),
      security: createOptionalPlugin({ get: () => null }, 'xpack.security', {}, 'security'),
      getSpacesAuditLogger: () => ({} as SpacesAuditLogger),
      config$: Rx.of({ maxSpaces: 1000 }),
    });

    spacesService.scopedClient = jest.fn((req: any) => {
      return Promise.resolve(
        new SpacesClient(
          null as any,
          () => null,
          null,
          mockSavedObjectsClientContract,
          { maxSpaces: 1000 },
          mockSavedObjectsClientContract,
          req
        )
      );
    });

    initApiFn({
      getLegacyAPI: () => legacyAPI,
      routePreCheckLicenseFn: pre,
      savedObjects: server.savedObjects,
      spacesService,
      log,
      legacyRouter: server.route.bind(server),
      http: coreSetupMock.http,
    });

    teardowns.push(() => server.stop());

    const headers = {
      authorization: 'foo',
    };

    const testRun = async () => {
      const response = await server.inject({
        method,
        url: path,
        headers,
        payload,
      });

      if (preCheckLicenseImpl && expectPreCheckLicenseCall) {
        expect(pre).toHaveBeenCalled();
      } else {
        expect(pre).not.toHaveBeenCalled();
      }

      if (expectSpacesClientCall) {
        expect(spacesService.scopedClient).toHaveBeenCalledWith(
          expect.objectContaining({
            headers: expect.objectContaining({
              authorization: headers.authorization,
            }),
          })
        );
      } else {
        expect(spacesService.scopedClient).not.toHaveBeenCalled();
      }

      return response;
    };

    return {
      server,
      headers,
      mockSavedObjectsRepository: mockSavedObjectsClientContract,
      mockSavedObjectsService: server.savedObjects,
      response: await testRun(),
    };
  };

  return {
    request,
    teardowns,
  };
}
