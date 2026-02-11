/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ArtifactService } from './artifact';
import { ConfigurationService, REFRESH_CONFIG_INTERVAL_MS } from './configuration';
import type { IndicesMetadataConfiguration } from './indices_metadata.types';
import { ArtifactNotFoundError, ManifestNotFoundError } from './artifact.errors';
import type { InfoResponse } from '@elastic/elasticsearch/lib/api/types';
import type { CdnConfig } from './artifact.types';
import { createMockTelemetryConfigProvider } from '../__mocks__';

jest.mock('./artifact');

describe('ConfigurationService', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let configurationService: ConfigurationService;
  let artifactService: jest.Mocked<ArtifactService>;
  const telemetryConfigProvider = createMockTelemetryConfigProvider();

  const defaultConfiguration: IndicesMetadataConfiguration = {
    indices_threshold: 100,
    datastreams_threshold: 100,
    indices_settings_threshold: 100,
    index_query_size: 100,
    ilm_stats_query_size: 100,
    ilm_policy_query_size: 100,
  };
  const fakeCdnConfig: CdnConfig = {
    url: 'http://localhost:3000',
    pubKey: '..',
    requestTimeout: 10,
  };
  const fakeClusterInfo: InfoResponse = {
    name: 'elasticsearch',
    cluster_name: 'elasticsearch',
    cluster_uuid: 'fiNVFADnQsepL3HXYMs-qg',
    version: {
      number: '9.2.0-SNAPSHOT',
      build_flavor: 'default',
      build_type: 'tar',
      build_hash: '560464e544b7e37e581874f44c19c7eac930f901',
      build_date: '2025-07-08T02:09:11.988781060Z',
      build_snapshot: true,
      lucene_version: '10.2.2',
      minimum_wire_compatibility_version: '8.19.0',
      minimum_index_compatibility_version: '8.0.0',
    },
    tagline: 'You Know, for Search',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    logger = loggingSystemMock.createLogger();
    configurationService = new ConfigurationService(logger);
    artifactService = new ArtifactService(
      logger,
      fakeClusterInfo,
      fakeCdnConfig
    ) as jest.Mocked<ArtifactService>;
  });

  afterEach(() => {
    configurationService.stop();
    jest.useRealTimers();
  });

  describe('initialization', () => {
    const initializationCases = [
      {
        name: 'should throw an error when trying to use the service before starting it',
        startService: false,
        expectThrow: true,
        expectedError: 'Configuration service not started',
      },
      {
        name: 'should initialize with default configuration',
        startService: true,
        expectThrow: false,
        expectedError: undefined,
      },
    ];

    it.each(initializationCases)('$name', ({ startService, expectThrow, expectedError }) => {
      if (startService) {
        configurationService.start(artifactService, defaultConfiguration, telemetryConfigProvider);
      }

      if (expectThrow) {
        expect(() => configurationService.getIndicesMetadataConfiguration$()).toThrow(
          expectedError
        );
      } else {
        expect(() => configurationService.getIndicesMetadataConfiguration$()).not.toThrow();
      }
    });
  });

  describe('getIndicesMetadataConfiguration$', () => {
    it('should return an observable with the default configuration initially', async () => {
      configurationService.start(artifactService, defaultConfiguration, telemetryConfigProvider);
      const config$ = configurationService.getIndicesMetadataConfiguration$();
      const config = await firstValueFrom(config$);
      expect(config).toEqual(defaultConfiguration);
    });

    it('should emit updated configuration when artifact service returns new configuration', async () => {
      const updatedConfig: IndicesMetadataConfiguration = {
        ...defaultConfiguration,
        indices_threshold: 200,
      };
      const updatedConfigTwo: IndicesMetadataConfiguration = {
        ...defaultConfiguration,
        indices_threshold: 300,
      };

      jest
        .spyOn(artifactService, 'getArtifact')
        .mockResolvedValueOnce({
          data: defaultConfiguration,
          modified: false,
        })
        .mockResolvedValueOnce({
          data: updatedConfig,
          modified: true,
        })
        .mockResolvedValueOnce({
          data: updatedConfigTwo,
          modified: true,
        });

      configurationService.start(artifactService, defaultConfiguration, telemetryConfigProvider);

      let config: IndicesMetadataConfiguration | undefined;
      configurationService.getIndicesMetadataConfiguration$().subscribe((c) => {
        config = c;
      });

      expect(config).toEqual(defaultConfiguration);

      await jest.advanceTimersByTimeAsync(REFRESH_CONFIG_INTERVAL_MS * 1.1);
      expect(config).toEqual(updatedConfig);

      await jest.advanceTimersByTimeAsync(REFRESH_CONFIG_INTERVAL_MS * 1.1);
      expect(config).toEqual(updatedConfigTwo);

      await jest.advanceTimersByTimeAsync(REFRESH_CONFIG_INTERVAL_MS * 1.1);
      expect(config).toEqual(updatedConfigTwo);
    });
  });

  describe('telemetry opt-out', () => {
    it('should skip configuration retrieval when telemetry is opted out', async () => {
      const optedOutProvider = createMockTelemetryConfigProvider(false);

      jest.spyOn(artifactService, 'getArtifact').mockResolvedValue({
        data: { ...defaultConfiguration, indices_threshold: 200 },
        modified: true,
      });

      configurationService.start(artifactService, defaultConfiguration, optedOutProvider);

      let config: IndicesMetadataConfiguration | undefined;
      configurationService.getIndicesMetadataConfiguration$().subscribe((c) => {
        config = c;
      });

      expect(config).toEqual(defaultConfiguration);

      await jest.advanceTimersByTimeAsync(REFRESH_CONFIG_INTERVAL_MS * 1.1);

      expect(config).toEqual(defaultConfiguration);
      expect(artifactService.getArtifact).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'Skipping configuration retrieval, telemetry opted out'
      );
    });
  });

  describe('error handling during configuration refresh', () => {
    const createAggregateCauseError = () =>
      new Error('request failed', {
        cause: new AggregateError([new Error('connection refused')], 'aggregate error'),
      });

    const errorCases = [
      {
        name: 'ManifestNotFoundError',
        createError: () => new ManifestNotFoundError('test-manifest'),
      },
      {
        name: 'ArtifactNotFoundError',
        createError: () => new ArtifactNotFoundError('test-artifact'),
      },
      {
        name: 'AggregateError (as cause)',
        createError: createAggregateCauseError,
      },
      {
        name: 'UnexpectedError',
        createError: () => new Error('unexpected error during artifact retrieval'),
      },
    ];

    describe('configuration resilience', () => {
      it.each(errorCases)(
        'should maintain last valid configuration when $name occurs',
        async ({ createError }) => {
          const error = createError();

          jest
            .spyOn(artifactService, 'getArtifact')
            .mockResolvedValueOnce({
              data: defaultConfiguration,
              modified: true,
            })
            .mockRejectedValue(error);

          configurationService.start(
            artifactService,
            defaultConfiguration,
            telemetryConfigProvider
          );
          const config$ = configurationService.getIndicesMetadataConfiguration$();

          let config: IndicesMetadataConfiguration | undefined;
          let updatedCount = 0;
          config$.subscribe((c) => {
            updatedCount++;
            config = c;
          });

          expect(config).toEqual(defaultConfiguration);

          for (let i = 0; i < 10; i++) {
            await jest.advanceTimersByTimeAsync(REFRESH_CONFIG_INTERVAL_MS * 1.1);
            expect(config).toEqual(defaultConfiguration);
          }

          // Verify the observable emitted exactly twice:
          // 1. Initial emission with default configuration (from startWith)
          // 2. First successful artifact retrieval
          // After errors occur, no new emissions should happen as the configuration remains unchanged
          expect(updatedCount).toBe(2);
        }
      );
    });

    describe('error logging', () => {
      const loggingCases = [
        {
          name: 'ManifestNotFoundError',
          createError: () => new ManifestNotFoundError('test-manifest'),
          expectedLogLevel: 'warn' as const,
          expectedMessage: 'Indices metadata configuration manifest not found',
          getExpectedMeta: (error: Error) => ({ error }),
        },
        {
          name: 'ArtifactNotFoundError',
          createError: () => new ArtifactNotFoundError('test-artifact'),
          expectedLogLevel: 'warn' as const,
          expectedMessage: 'Indices metadata configuration artifact not found',
          getExpectedMeta: (error: Error) => ({ error }),
        },
        {
          name: 'AggregateError cause',
          createError: () => {
            const cause = new AggregateError([new Error('connection refused')], 'aggregate error');
            return new Error('request failed', { cause });
          },
          expectedLogLevel: 'error' as const,
          expectedMessage: (error: Error) =>
            `AggregateError while getting indices metadata configuration: ${error.cause}`,
          getExpectedMeta: (error: Error) => ({
            error,
            code: (error as NodeJS.ErrnoException).code,
            message: error.message,
            cause: error.cause,
          }),
        },
        {
          name: 'unexpected error',
          createError: () => new Error('unexpected error during artifact retrieval'),
          expectedLogLevel: 'error' as const,
          expectedMessage: (error: Error) =>
            `Unexpected error while getting indices metadata configuration: ${error}`,
          getExpectedMeta: (error: Error) => ({
            error,
            code: undefined,
            message: error.message,
            cause: undefined,
          }),
        },
      ];

      it.each(loggingCases)(
        'should log appropriately when $name occurs',
        async ({ createError, expectedLogLevel, expectedMessage, getExpectedMeta }) => {
          const error = createError();

          jest.spyOn(artifactService, 'getArtifact').mockRejectedValue(error);

          configurationService.start(
            artifactService,
            defaultConfiguration,
            telemetryConfigProvider
          );
          configurationService.getIndicesMetadataConfiguration$().subscribe();

          await jest.advanceTimersByTimeAsync(REFRESH_CONFIG_INTERVAL_MS * 1.1);

          const message =
            typeof expectedMessage === 'function' ? expectedMessage(error) : expectedMessage;

          expect(logger[expectedLogLevel]).toHaveBeenCalledWith(message, getExpectedMeta(error));
        }
      );
    });
  });
});
