/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { FakeRawRequest, Headers } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import { LockManagerService } from '@kbn/lock-manager';
import type { StreamsPluginStartDependencies } from '../../../types';
import type { StreamsClient } from '../../streams/client';
import { StreamsClient as StreamsClientClass } from '../../streams/client';
import { AssetClient } from '../../streams/assets/asset_client';
import { SystemClient } from '../../streams/system/system_client';
import { QueryClient } from '../../streams/assets/query/query_client';
import { assetStorageSettings } from '../../streams/assets/storage_settings';
import { systemStorageSettings } from '../../streams/system/storage_settings';
import { streamsStorageSettings } from '../../streams/service';
import { migrateOnRead } from '../../streams/helpers/migrate_on_read';
import { registerStreamsUsageCollector } from './streams_usage_collector';

/**
 * Service for collecting Streams usage statistics for telemetry
 *
 * This service creates internal StreamsClient instances optimized for read-only
 * telemetry collection. It bypasses authentication requirements by using:
 *
 * 1. Internal Elasticsearch clients (asInternalUser) for direct data access
 * 2. Internal SavedObjects repositories for system-level access
 * 3. Read-only mock RulesClients that handle interface requirements without auth
 */
export class StatsTelemetryService {
  private readonly logger: Logger;
  private readonly isDev: boolean;

  constructor(logger: Logger, isDev: boolean) {
    this.logger = logger;
    this.isDev = isDev;
  }

  public setup(
    core: CoreSetup<StreamsPluginStartDependencies>,
    usageCollection?: UsageCollectionSetup
  ) {
    if (usageCollection) {
      this.logger.debug('[Streams Stats Telemetry Service] Setting up streams usage collector');
      registerStreamsUsageCollector(
        usageCollection,
        this.logger,
        () => this.getInternalStreamsClient(core),
        this.isDev
      );
    } else {
      this.logger.debug(
        '[Streams Stats Telemetry Service] Usage collection not available, skipping setup'
      );
    }
  }

  /**
   * Creates an internal StreamsClient for telemetry collection
   * Uses minimal clients that bypass/faking authentication requirements
   */
  private async getInternalStreamsClient(
    core: CoreSetup<StreamsPluginStartDependencies>
  ): Promise<StreamsClient> {
    const [coreStart] = await core.getStartServices();
    const logger = this.logger;

    // Create minimal clients for telemetry that don't require authentication
    const assetClient = await this.createMinimalAssetClient(core);
    const systemClient = await this.createMinimalSystemClient(core);
    const queryClient = await this.createMinimalQueryClient(core, assetClient);

    // Create StreamsClient with internal cluster client
    const internalClusterClient = coreStart.elasticsearch.client.asInternalUser;
    const isServerless = coreStart.elasticsearch.getCapabilities().serverless;

    // Create a mock scoped cluster client that uses internal user
    const mockScopedClusterClient = {
      asCurrentUser: internalClusterClient,
      asInternalUser: internalClusterClient,
    };

    const storageAdapter = new StorageIndexAdapter(
      internalClusterClient,
      logger,
      streamsStorageSettings,
      {
        migrateSource: migrateOnRead,
      }
    );

    const mockRequest = this.createFakeRequestForTelemetry(core);

    return new StreamsClientClass({
      assetClient,
      queryClient,
      systemClient,
      logger,
      scopedClusterClient: mockScopedClusterClient as any,
      lockManager: new LockManagerService(core, logger),
      storageClient: storageAdapter.getClient(),
      request: mockRequest,
      isServerless,
      isDev: this.isDev,
    });
  }

  /**
   * Creates a minimal AssetClient for telemetry with mock RulesClient
   */
  private async createMinimalAssetClient(core: CoreSetup<StreamsPluginStartDependencies>) {
    const [coreStart] = await core.getStartServices();

    const adapter = new StorageIndexAdapter(
      coreStart.elasticsearch.client.asInternalUser,
      this.logger.get('assets'),
      assetStorageSettings
    );

    const mockRulesClient = this.createReadOnlyMockRulesClient('AssetClient');

    return new AssetClient({
      storageClient: adapter.getClient() as any,
      soClient: coreStart.savedObjects.createInternalRepository(),
      rulesClient: mockRulesClient,
    });
  }

  /**
   * Creates a minimal SystemClient for telemetry
   */
  private async createMinimalSystemClient(core: CoreSetup<StreamsPluginStartDependencies>) {
    const [coreStart] = await core.getStartServices();

    const adapter = new StorageIndexAdapter(
      coreStart.elasticsearch.client.asInternalUser,
      this.logger.get('systems'),
      systemStorageSettings
    );

    return new SystemClient({
      storageClient: adapter.getClient() as any,
    });
  }

  /**
   * Creates a minimal QueryClient for telemetry with mock RulesClient
   */
  private async createMinimalQueryClient(
    core: CoreSetup<StreamsPluginStartDependencies>,
    assetClient: any
  ) {
    const isSignificantEventsEnabled = false; // Default to false for telemetry

    const mockRulesClient = this.createReadOnlyMockRulesClient('QueryClient');

    return new QueryClient(
      {
        assetClient,
        rulesClient: mockRulesClient,
        logger: this.logger,
      },
      isSignificantEventsEnabled
    );
  }

  /**
   * Creates a minimal mock RulesClient for telemetry collection
   *
   * Only implements the methods actually used by AssetClient and QueryClient:
   * - AssetClient: uses get() method
   * - QueryClient: uses create() and update() methods
   *
   * @param clientType - The type of client using this mock (for logging context)
   */
  private createReadOnlyMockRulesClient(clientType: string) {
    return {
      // AssetClient uses this - return "not found" error (handled gracefully)
      get: async ({ id }: { id: string }) => {
        this.logger.debug(`[Telemetry:${clientType}] Rule get skipped for ID: ${id}`);
        throw new Error(`Rule ${id} not found`);
      },

      // QueryClient uses this - block write operation for telemetry
      create: async () => {
        const error = `Rule creation not supported in read-only telemetry mode (${clientType})`;
        this.logger.warn(`[Telemetry:${clientType}] ${error}`);
        throw new Error(error);
      },

      // QueryClient uses this - block write operation for telemetry
      update: async ({ id }: { id: string }) => {
        const error = `Rule update not supported in read-only telemetry mode (${clientType})`;
        this.logger.warn(`[Telemetry:${clientType}] ${error} - attempted to update rule: ${id}`);
        throw new Error(error);
      },
    } as any;
  }

  /**
   * Creates a fake Kibana request for internal telemetry collection
   * This request is used to create clients which are dependencies of StreamsClient
   */
  private createFakeRequestForTelemetry(core: CoreSetup<StreamsPluginStartDependencies>) {
    const requestHeaders: Headers = {
      'kbn-system-request': 'true', // Mark as system request
      'x-elastic-internal-origin': 'streams-telemetry', // Mark as internal operation
    };

    const fakeRawRequest: FakeRawRequest = {
      headers: requestHeaders,
      path: '/',
      // Mark this as authenticated for internal telemetry collection
      auth: { isAuthenticated: true },
      // Mark this as an internal cross-space telemetry request
      route: { settings: { tags: ['internal', 'telemetry', 'cross-space'] } },
    };

    const fakeRequest = kibanaRequestFactory(fakeRawRequest);
    return fakeRequest;
  }
}
