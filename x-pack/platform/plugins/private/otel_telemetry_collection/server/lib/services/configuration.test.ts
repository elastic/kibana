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
import type { OtelTelemetryConfiguration } from '../constants';
import { DEFAULT_OTEL_TELEMETRY_CONFIGURATION } from '../constants';
import { ArtifactNotFoundError, ManifestNotFoundError } from './artifact.errors';
import type { InfoResponse } from '@elastic/elasticsearch/lib/api/types';
import type { CdnConfig } from '../constants';
import { createMockTelemetryConfigProvider } from '../__mocks__';

jest.mock('./artifact');

describe('ConfigurationService', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let configurationService: ConfigurationService;
  let artifactService: jest.Mocked<ArtifactService>;
  const telemetryConfigProvider = createMockTelemetryConfigProvider();

  const defaultConfiguration = DEFAULT_OTEL_TELEMETRY_CONFIGURATION;

  const fakeCdnConfig: CdnConfig = {
    url: 'http://localhost:3000',
    pubKey: '..',
    requestTimeout: 10,
  };
  const fakeClusterInfo: InfoResponse = {
    name: 'elasticsearch',
    cluster_name: 'elasticsearch',
    cluster_uuid: 'test-uuid',
    version: {
      number: '9.1.0-SNAPSHOT',
      build_flavor: 'default',
      build_type: 'tar',
      build_hash: 'abc123',
      build_date: '2025-07-08T00:00:00.000Z',
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
    it('should throw when used before starting', () => {
      expect(() => configurationService.getOtelTelemetryConfiguration$()).toThrow(
        'Configuration service not started'
      );
    });

    it('should not throw after starting', () => {
      configurationService.start(artifactService, defaultConfiguration, telemetryConfigProvider);
      expect(() => configurationService.getOtelTelemetryConfiguration$()).not.toThrow();
    });
  });

  describe('getOtelTelemetryConfiguration$', () => {
    it('should emit default configuration initially', async () => {
      configurationService.start(artifactService, defaultConfiguration, telemetryConfigProvider);
      const config = await firstValueFrom(configurationService.getOtelTelemetryConfiguration$());
      expect(config).toEqual(defaultConfiguration);
    });

    it('should emit artifact configuration after CDN fetch', async () => {
      const artifactConfig: OtelTelemetryConfiguration = {
        ...defaultConfiguration,
        max_elements_per_event: 2000,
      };

      jest.spyOn(artifactService, 'getArtifact').mockResolvedValueOnce({
        data: artifactConfig,
        modified: true,
      });

      configurationService.start(artifactService, defaultConfiguration, telemetryConfigProvider);

      let config: OtelTelemetryConfiguration | undefined;
      configurationService.getOtelTelemetryConfiguration$().subscribe((c) => {
        config = c;
      });

      expect(config).toEqual(defaultConfiguration);

      await jest.advanceTimersByTimeAsync(REFRESH_CONFIG_INTERVAL_MS * 1.1);
      expect(config).toEqual(artifactConfig);
    });

    it('should keep defaults when artifact has not been modified', async () => {
      jest.spyOn(artifactService, 'getArtifact').mockResolvedValueOnce({
        data: defaultConfiguration,
        modified: false,
      });

      configurationService.start(artifactService, defaultConfiguration, telemetryConfigProvider);

      let config: OtelTelemetryConfiguration | undefined;
      configurationService.getOtelTelemetryConfiguration$().subscribe((c) => {
        config = c;
      });

      expect(config).toEqual(defaultConfiguration);

      await jest.advanceTimersByTimeAsync(REFRESH_CONFIG_INTERVAL_MS * 1.1);
      expect(config).toEqual(defaultConfiguration);
    });

    it('should pick up successive artifact updates', async () => {
      const firstUpdate: OtelTelemetryConfiguration = {
        ...defaultConfiguration,
        composite_page_size: 500,
      };
      const secondUpdate: OtelTelemetryConfiguration = {
        ...defaultConfiguration,
        composite_page_size: 2000,
      };

      jest
        .spyOn(artifactService, 'getArtifact')
        .mockResolvedValueOnce({ data: defaultConfiguration, modified: false })
        .mockResolvedValueOnce({ data: firstUpdate, modified: true })
        .mockResolvedValueOnce({ data: secondUpdate, modified: true });

      configurationService.start(artifactService, defaultConfiguration, telemetryConfigProvider);

      let config: OtelTelemetryConfiguration | undefined;
      configurationService.getOtelTelemetryConfiguration$().subscribe((c) => {
        config = c;
      });

      expect(config).toEqual(defaultConfiguration);

      await jest.advanceTimersByTimeAsync(REFRESH_CONFIG_INTERVAL_MS * 1.1);
      expect(config).toEqual(firstUpdate);

      await jest.advanceTimersByTimeAsync(REFRESH_CONFIG_INTERVAL_MS * 1.1);
      expect(config).toEqual(secondUpdate);
    });
  });

  describe('telemetry opt-out', () => {
    it('should skip CDN fetch and keep defaults when telemetry is opted out', async () => {
      const optedOutProvider = createMockTelemetryConfigProvider(false);

      jest.spyOn(artifactService, 'getArtifact').mockResolvedValue({
        data: { ...defaultConfiguration, max_elements_per_event: 200 },
        modified: true,
      });

      configurationService.start(artifactService, defaultConfiguration, optedOutProvider);

      let config: OtelTelemetryConfiguration | undefined;
      configurationService.getOtelTelemetryConfiguration$().subscribe((c) => {
        config = c;
      });

      expect(config).toEqual(defaultConfiguration);

      await jest.advanceTimersByTimeAsync(REFRESH_CONFIG_INTERVAL_MS * 1.1);

      expect(config).toEqual(defaultConfiguration);
      expect(artifactService.getArtifact).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    const errorCases = [
      {
        name: 'ManifestNotFoundError',
        createError: () => new ManifestNotFoundError('test-manifest'),
        logLevel: 'warn' as const,
      },
      {
        name: 'ArtifactNotFoundError',
        createError: () => new ArtifactNotFoundError('test-artifact'),
        logLevel: 'warn' as const,
      },
      {
        name: 'AggregateError cause',
        createError: () =>
          new Error('request failed', {
            cause: new AggregateError([new Error('connection refused')], 'aggregate error'),
          }),
        logLevel: 'error' as const,
      },
      {
        name: 'unexpected error',
        createError: () => new Error('unexpected error'),
        logLevel: 'error' as const,
      },
    ];

    it.each(errorCases)(
      'should maintain last valid config when $name occurs',
      async ({ createError }) => {
        const artifactConfig: OtelTelemetryConfiguration = {
          ...defaultConfiguration,
          max_elements_per_event: 3000,
        };

        jest
          .spyOn(artifactService, 'getArtifact')
          .mockResolvedValueOnce({ data: artifactConfig, modified: true })
          .mockRejectedValue(createError());

        configurationService.start(artifactService, defaultConfiguration, telemetryConfigProvider);

        let config: OtelTelemetryConfiguration | undefined;
        configurationService.getOtelTelemetryConfiguration$().subscribe((c) => {
          config = c;
        });

        expect(config).toEqual(defaultConfiguration);

        await jest.advanceTimersByTimeAsync(REFRESH_CONFIG_INTERVAL_MS * 1.1);
        expect(config).toEqual(artifactConfig);

        await jest.advanceTimersByTimeAsync(REFRESH_CONFIG_INTERVAL_MS * 1.1);
        expect(config).toEqual(artifactConfig);
      }
    );

    it.each(errorCases)(
      'should fall back to defaults when $name occurs before any successful fetch',
      async ({ createError }) => {
        jest.spyOn(artifactService, 'getArtifact').mockRejectedValue(createError());

        configurationService.start(artifactService, defaultConfiguration, telemetryConfigProvider);

        let config: OtelTelemetryConfiguration | undefined;
        configurationService.getOtelTelemetryConfiguration$().subscribe((c) => {
          config = c;
        });

        expect(config).toEqual(defaultConfiguration);

        await jest.advanceTimersByTimeAsync(REFRESH_CONFIG_INTERVAL_MS * 1.1);
        expect(config).toEqual(defaultConfiguration);
      }
    );
  });
});
