/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import {
  ReplaySubject,
  timer,
  exhaustMap,
  takeUntil,
  startWith,
  filter,
  distinctUntilChanged,
  shareReplay,
} from 'rxjs';
import { isEqual } from 'lodash';
import type { Logger, LogMeta } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { ArtifactService } from './artifact';
import { ArtifactNotFoundError, ManifestNotFoundError } from './artifact.errors';
import type { TelemetryConfigProvider } from './telemetry_config_provider';
import type { OtelTelemetryConfiguration } from '../constants';

export const REFRESH_CONFIG_INTERVAL_MS = 60 * 60 * 1000;
const CONFIGURATION_ARTIFACT_NAME = 'otel-telemetry-collection-configuration-v1';

export const OtelTelemetryConfigurationSchema = schema.object({
  enabled: schema.boolean(),
  query_window: schema.string(),
  query_timeout: schema.string(),
  max_elements_per_event: schema.number(),
  composite_page_size: schema.number(),
  max_total_buckets: schema.number(),
});

export class ConfigurationService {
  private readonly logger: Logger;
  private artifactService!: ArtifactService;
  private otelTelemetryConfiguration$!: Observable<OtelTelemetryConfiguration | undefined>;
  private telemetryConfigProvider!: TelemetryConfigProvider;

  private readonly stop$ = new ReplaySubject<void>(1);

  constructor(logger: Logger) {
    this.logger = logger.get(ConfigurationService.name);
  }

  public start(
    artifactService: ArtifactService,
    defaultConfiguration: OtelTelemetryConfiguration,
    telemetryConfigProvider: TelemetryConfigProvider
  ) {
    this.artifactService = artifactService;
    this.telemetryConfigProvider = telemetryConfigProvider;
    this.otelTelemetryConfiguration$ = timer(0, REFRESH_CONFIG_INTERVAL_MS).pipe(
      exhaustMap(() => this.getConfiguration()),
      takeUntil(this.stop$),
      startWith(defaultConfiguration),
      filter((cfg) => cfg !== undefined),
      distinctUntilChanged(isEqual),
      shareReplay(1)
    );
  }

  public stop() {
    this.stop$.next();
    this.stop$.complete();
  }

  public getOtelTelemetryConfiguration$(): Observable<OtelTelemetryConfiguration | undefined> {
    this.ensureStarted();
    return this.otelTelemetryConfiguration$;
  }

  private async getConfiguration(): Promise<OtelTelemetryConfiguration | undefined> {
    this.ensureStarted();

    try {
      if (!this.telemetryConfigProvider.getIsOptedIn()) {
        this.logger.debug('Skipping configuration retrieval, telemetry opted out');
        return undefined;
      }
      this.logger.debug('Getting OTel telemetry configuration');
      const artifact = await this.artifactService.getArtifact(CONFIGURATION_ARTIFACT_NAME);
      if (!artifact.modified) {
        this.logger.debug('OTel telemetry configuration has not been modified');
        return undefined;
      }

      this.logger.debug('OTel telemetry configuration has been modified', {
        artifact,
      } as LogMeta);
      return OtelTelemetryConfigurationSchema.validate(artifact.data);
    } catch (error) {
      const cause = error.cause;
      const code = error.code;
      const message = error.message;

      if (error instanceof ManifestNotFoundError) {
        this.logger.warn('OTel telemetry configuration manifest not found', { error });
      } else if (error instanceof ArtifactNotFoundError) {
        this.logger.warn('OTel telemetry configuration artifact not found', { error });
      } else if (cause && cause instanceof AggregateError) {
        this.logger.error(`AggregateError while getting OTel telemetry configuration: ${cause}`, {
          error,
          code,
          message,
          cause,
        } as LogMeta);
      } else {
        this.logger.error(`Unexpected error while getting OTel telemetry configuration: ${error}`, {
          error,
          code,
          message,
          cause,
        } as LogMeta);
      }
      return undefined;
    }
  }

  private ensureStarted() {
    if (
      !this.artifactService ||
      !this.otelTelemetryConfiguration$ ||
      !this.telemetryConfigProvider
    ) {
      throw new Error('Configuration service not started');
    }
  }
}
