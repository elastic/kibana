/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync } from 'fs';
import Path from 'path';
import { pathToFileURL } from 'url';
import type { Logger } from '@kbn/logging';
import { DEFAULT_ARTIFACT_REPOSITORY_URL, type ProductDocBaseConfig } from './config';

// Populated by the build for serverless distributions only
export const BUNDLED_ARTIFACTS_PATH = Path.resolve(__dirname, '..', 'target', 'bundled_artifacts');

/**
 * Picks the artifact repository: on serverless the artifacts bundled into the distribution,
 * so that no request ever leaves the container; otherwise the configured URL. A non-default
 * `artifactRepositoryUrl` always wins so tests and operators can point at another repository.
 */
export const resolveArtifactRepositoryUrl = ({
  config,
  isServerless,
  logger,
  bundledArtifactsPath = BUNDLED_ARTIFACTS_PATH,
}: {
  config: Pick<ProductDocBaseConfig, 'artifactRepositoryUrl' | 'useBundledArtifacts'>;
  isServerless: boolean;
  logger: Logger;
  bundledArtifactsPath?: string;
}): string => {
  const isCustomRepository = config.artifactRepositoryUrl !== DEFAULT_ARTIFACT_REPOSITORY_URL;
  if (!isServerless || !config.useBundledArtifacts || isCustomRepository) {
    logger.info(
      `Using product documentation artifact repository [${config.artifactRepositoryUrl}]`
    );
    return config.artifactRepositoryUrl;
  }
  if (!existsSync(Path.join(bundledArtifactsPath, 'index.xml'))) {
    logger.info(
      `No bundled product documentation artifacts at [${bundledArtifactsPath}], using artifact repository [${config.artifactRepositoryUrl}]`
    );
    return config.artifactRepositoryUrl;
  }
  const bundledUrl = pathToFileURL(bundledArtifactsPath).href;
  logger.info(`Using bundled product documentation artifacts [${bundledUrl}]`);
  return bundledUrl;
};
