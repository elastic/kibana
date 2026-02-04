/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { DocumentationProduct, getArtifactName } from '@kbn/product-doc-common';
import { deleteFile } from '@kbn/fs';
import { DatasetSampleType } from '../../../common';
import { majorMinor, latestVersion } from './utils/semver';
import {
  fetchArtifactVersions,
  validateArtifactArchive,
  download,
  openZipArchive,
  loadMappingFile,
  loadManifestFile,
} from './utils';
import type { ZipArchive } from '../types';

interface ArtifactManagerOpts {
  artifactsFolder: string;
  artifactRepositoryUrl: string;
  kibanaVersion: string;
  logger: Logger;
}

interface PreparedArtifact {
  archive: ZipArchive;
  manifest: any;
  mappings: any;
}

const mapDatasetSampleTypeToProduct = {
  [DatasetSampleType.elasticsearch]: DocumentationProduct.elasticsearch,
};

export class ArtifactManager {
  private readonly artifactsFolder: string;
  private readonly artifactRepositoryUrl: string;
  private readonly currentVersion: string;
  private readonly log: Logger;
  private artifactVersions?: Record<string, string[]>;
  private readonly downloadedFiles = new Set<string>();

  constructor({
    artifactsFolder,
    artifactRepositoryUrl,
    kibanaVersion,
    logger,
  }: ArtifactManagerOpts) {
    this.artifactsFolder = artifactsFolder;
    this.artifactRepositoryUrl = artifactRepositoryUrl;
    this.currentVersion = majorMinor(kibanaVersion);
    this.log = logger;
  }

  async prepareArtifact(
    sampleType: DatasetSampleType,
    abortController?: AbortController
  ): Promise<PreparedArtifact> {
    const productName = mapDatasetSampleTypeToProduct[sampleType];

    if (!productName) {
      throw new Error(`Unsupported sample type for artifact preparation: ${sampleType}`);
    }
    const productVersion = majorMinor(await this.getProductVersion(productName));
    const artifactFileName = getArtifactName({ productName, productVersion });
    const artifactUrl = `${this.artifactRepositoryUrl}/${artifactFileName}`;
    const artifactPathAtVolume = `${this.artifactsFolder}/${artifactFileName}`;
    this.log.debug(`Downloading artifact from [${artifactUrl}]`);
    const artifactFullPath = await download(
      artifactUrl,
      artifactPathAtVolume,
      'application/zip',
      abortController
    );

    this.downloadedFiles.add(artifactPathAtVolume);

    const archive = await openZipArchive(artifactFullPath);
    validateArtifactArchive(archive);

    const [manifest, mappings] = await Promise.all([
      loadManifestFile(archive),
      loadMappingFile(archive),
    ]);

    return { archive, manifest, mappings };
  }

  private async getProductVersion(productName: string): Promise<string> {
    if (!this.artifactVersions) {
      this.artifactVersions = await fetchArtifactVersions({
        artifactRepositoryUrl: this.artifactRepositoryUrl,
      });
    }

    const availableVersions = this.artifactVersions[productName];
    if (!availableVersions?.length) {
      throw new Error(`No versions found for product [${productName}]`);
    }

    return availableVersions.includes(this.currentVersion)
      ? this.currentVersion
      : latestVersion(availableVersions);
  }

  async cleanup() {
    for (const filePath of this.downloadedFiles) {
      try {
        await deleteFile(filePath);
        this.log.debug(`Deleted downloaded file: ${filePath}`);
      } catch (error) {
        this.log.warn(`Failed to delete file ${filePath}: ${error.message}`);
      }
    }
    this.downloadedFiles.clear();
  }
}
