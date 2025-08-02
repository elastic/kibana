/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  Observable,
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
import { ArtifactService } from './artifact';
import { ArtifactNotFoundError, ManifestNotFoundError } from './artifact.errors';
import {
  IndicesMetadataConfiguration,
  IndicesMetadataConfigurationSchema,
} from './indices_metadata.types';
export const REFRESH_CONFIG_INTERVAL_MS = 60 * 60 * 1000;
const CONFIGURATION_ARTIFACT_NAME = 'indices-metadata-configuration';

export class ConfigurationService {
  private readonly logger: Logger;
  private artifactService!: ArtifactService;
  private indicesMetadataConfiguration$!: Observable<IndicesMetadataConfiguration | undefined>;

  private readonly stop$ = new ReplaySubject<void>(1);

  constructor(logger: Logger) {
    this.logger = logger.get(ConfigurationService.name);
  }

  public start(
    artifactService: ArtifactService,
    defaultConfiguration: IndicesMetadataConfiguration
  ) {
    this.artifactService = artifactService;
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
      if (error instanceof ManifestNotFoundError) {
        this.logger.warn('Indices metadata configuration manifest not found');
      } else if (error instanceof ArtifactNotFoundError) {
        this.logger.warn('Indices metadata configuration artifact not found');
      } else {
        this.logger.error('Failed to get indices metadata configuration', { error } as LogMeta);
      }
      return undefined;
    }
  }

  private ensureStarted() {
    if (!this.artifactService || !this.indicesMetadataConfiguration$) {
      throw new Error('Configuration service not started');
    }
  }
}
