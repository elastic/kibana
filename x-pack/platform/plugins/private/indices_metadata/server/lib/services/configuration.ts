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
import type { Logger, LogMeta } from '@kbn/core/server';
import type { ArtifactService } from './artifact';
import { ArtifactNotFoundError, ManifestNotFoundError } from './artifact.errors';
import type { IndicesMetadataConfiguration } from './indices_metadata.types';
import { IndicesMetadataConfigurationSchema } from './indices_metadata.types';
import type { TelemetryConfigProvider } from './telemetry_config_provider';
export const REFRESH_CONFIG_INTERVAL_MS = 60 * 60 * 1000;
const CONFIGURATION_ARTIFACT_NAME = 'indices-metadata-configuration-v1';

export class ConfigurationService {
  private readonly logger: Logger;
  private artifactService!: ArtifactService;
  private indicesMetadataConfiguration$!: Observable<IndicesMetadataConfiguration | undefined>;
  private telemetryConfigProvider!: TelemetryConfigProvider;

  private readonly stop$ = new ReplaySubject<void>(1);

  constructor(logger: Logger) {
    this.logger = logger.get(ConfigurationService.name);
  }

  public start(
    artifactService: ArtifactService,
    defaultConfiguration: IndicesMetadataConfiguration,
    telemetryConfigProvider: TelemetryConfigProvider
  ) {
    this.artifactService = artifactService;
    this.telemetryConfigProvider = telemetryConfigProvider;
    this.indicesMetadataConfiguration$ = timer(0, REFRESH_CONFIG_INTERVAL_MS).pipe(
      exhaustMap(() => this.getConfiguration()),
      takeUntil(this.stop$),
      startWith(defaultConfiguration),
      filter((config) => config !== undefined),
      distinctUntilChanged(),
      shareReplay(1)
    );
  }

  public stop() {
    this.stop$.next();
    this.stop$.complete();
  }

  public getIndicesMetadataConfiguration$(): Observable<IndicesMetadataConfiguration | undefined> {
    this.ensureStarted();

    return this.indicesMetadataConfiguration$;
  }

  private async getConfiguration(): Promise<IndicesMetadataConfiguration | undefined> {
    this.ensureStarted();

    try {
      if (!this.telemetryConfigProvider.getIsOptedIn()) {
        this.logger.debug('Skipping configuration retrieval, telemetry opted out');
        return undefined;
      }
      this.logger.debug('Getting indices metadata configuration');
      const artifact = await this.artifactService.getArtifact(CONFIGURATION_ARTIFACT_NAME);
      if (!artifact.modified) {
        this.logger.debug('Indices metadata configuration has not been modified');
        return undefined;
      }

      this.logger.debug('Indices metadata configuration has been modified', {
        artifact,
      } as LogMeta);
      return IndicesMetadataConfigurationSchema.validate(artifact.data);
    } catch (error) {
      const cause = error.cause;
      const code = error.code;
      const message = error.message;

      if (error instanceof ManifestNotFoundError) {
        this.logger.warn('Indices metadata configuration manifest not found', { error });
      } else if (error instanceof ArtifactNotFoundError) {
        this.logger.warn('Indices metadata configuration artifact not found', { error });
      } else if (cause && cause instanceof AggregateError) {
        this.logger.error(`AggregateError while getting indices metadata configuration: ${cause}`, {
          error,
          code,
          message,
          cause,
        } as LogMeta);
      } else {
        this.logger.error(
          `Unexpected error while getting indices metadata configuration: ${error}`,
          {
            error,
            code,
            message,
            cause,
          } as LogMeta
        );
      }
      return undefined;
    }
  }

  private ensureStarted() {
    if (
      !this.artifactService ||
      !this.indicesMetadataConfiguration$ ||
      !this.telemetryConfigProvider
    ) {
      throw new Error('Configuration service not started');
    }
  }
}
