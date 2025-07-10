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
const REFRESH_CONFIG_INTERVAL_MS = 30 * 1000; // 60 * 60 * 1000;
const CONFIGURATION_ARTIFACT_NAME = 'indices-metadata-configuration';

export class ConfigurationService {
  private readonly logger: Logger;
  private readonly artifactService: ArtifactService;
  private indicesMetadataConfiguration$!: Observable<IndicesMetadataConfiguration | undefined>;

  private readonly stop$ = new ReplaySubject<void>(1);

  constructor(logger: Logger, artifactService: ArtifactService) {
    this.logger = logger.get(ConfigurationService.name);
    this.artifactService = artifactService;
  }

  public start() {
    this.indicesMetadataConfiguration$ = timer(0, REFRESH_CONFIG_INTERVAL_MS).pipe(
      exhaustMap(() => this.getConfiguration()),
      takeUntil(this.stop$),
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
    return this.indicesMetadataConfiguration$;
  }

  private async getConfiguration(): Promise<IndicesMetadataConfiguration | undefined> {
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
}
