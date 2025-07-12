/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, LogMeta } from '@kbn/core/server';
import { InfoResponse } from '@elastic/elasticsearch/lib/api/types';
import axios from 'axios';
import { createVerify } from 'crypto';
import AdmZip from 'adm-zip';
import { cloneDeep } from 'lodash';

import type { Manifest, CdnConfig } from './artifact.types';
import { ArtifactNotFoundError, ManifestNotFoundError } from './artifact.errors';

export class ArtifactService {
  private readonly logger: Logger;
  private readonly cache: Map<string, CacheEntry>;

  private cdnConfig?: CdnConfig;
  private clusterInfo?: InfoResponse;
  private manifestUrl?: string;

  constructor(logger: Logger, clusterInfo: InfoResponse, cdnConfig: CdnConfig) {
    this.logger = logger.get(ArtifactService.name);
    this.cache = new Map();
    this.configure(clusterInfo, cdnConfig);
  }

  public configure(clusterInfo: InfoResponse, cdnConfig: CdnConfig) {
    this.logger.debug('Configuring artifact service with cluster info', { clusterInfo } as LogMeta);

    if (!clusterInfo.version?.number) {
      throw new Error(
        'Cluster info must include version number, impossible to calculate the manifest url'
      );
    }

    this.clusterInfo = clusterInfo;
    this.cdnConfig = cdnConfig;

    const version =
      clusterInfo.version.number.substring(0, clusterInfo.version.number.indexOf('-')) ||
      clusterInfo.version.number;
    this.manifestUrl = `${this.cdnConfig?.url}/downloads/kibana/manifest/artifacts-${version}.zip`;

    this.logger.debug('Artifact service started', { manifestUrl: this.manifestUrl } as LogMeta);
  }

  public async getArtifact(name: string): Promise<Manifest> {
    this.logger.debug('Getting artifact', { name } as LogMeta);

    return axios
      .get(this.getManifestUrl(), {
        headers: this.headers(name),
        timeout: this.cdnConfig?.requestTimeout,
        validateStatus: (status) => status < 500,
        responseType: 'arraybuffer',
      })
      .then(async (response) => {
        switch (response.status) {
          case 200:
            const manifest = {
              data: await this.getManifest(name, response.data),
              modified: true,
            };
            // only update etag if we got a valid manifest
            if (response.headers && response.headers.etag) {
              const cacheEntry = {
                manifest: { ...manifest, modified: false },
                etag: response.headers?.etag ?? '',
              };
              this.cache.set(name, cacheEntry);
            }
            return cloneDeep(manifest);
          case 304:
            return cloneDeep(this.getCachedManifest(name));
          case 404:
            // just in case, remove the entry
            this.cache.delete(name);
            throw new ManifestNotFoundError(this.manifestUrl!);
          default:
            throw Error(`Failed to download manifest, unexpected status code: ${response.status}`);
        }
      });
  }

  private getManifestUrl() {
    if (!this.manifestUrl) {
      throw Error(`No manifest url for version ${this.clusterInfo?.version?.number}`);
    }
    return this.manifestUrl;
  }

  private getCachedManifest(name: string): Manifest {
    const entry = this.cache.get(name);
    if (!entry) {
      throw new ArtifactNotFoundError(name);
    }
    return entry.manifest;
  }

  private async getManifest(name: string, data: Buffer): Promise<unknown> {
    const zip = new AdmZip(data);

    const manifestFile = zip.getEntry('manifest.json');
    const signatureFile = zip.getEntry('manifest.sig');

    if (!manifestFile) {
      throw Error('No manifest.json in artifact zip');
    }

    if (!signatureFile) {
      throw Error('No manifest.sig in artifact zip');
    }

    if (!this.isSignatureValid(manifestFile.getData(), signatureFile.getData())) {
      throw Error('Invalid manifest signature');
    }

    const manifest = JSON.parse(manifestFile.getData().toString());
    const artifact = manifest.artifacts[name];
    if (artifact) {
      const url = `${this.cdnConfig?.url}${artifact.relative_url}`;
      const artifactResponse = await axios.get(url, { timeout: this.cdnConfig?.requestTimeout });
      return artifactResponse.data;
    } else {
      throw new ArtifactNotFoundError(name);
    }
  }

  private headers(name: string): Record<string, string> {
    const cacheEntry = this.cache.get(name);
    if (cacheEntry?.etag) {
      return { 'If-None-Match': cacheEntry.etag };
    }
    return {};
  }

  private isSignatureValid(data: Buffer, signature: Buffer): boolean {
    if (!this.cdnConfig) {
      throw Error('No CDN configuration provided');
    }

    const verifier = createVerify('RSA-SHA256');
    verifier.update(data);
    verifier.end();

    return verifier.verify(this.cdnConfig.pubKey, signature);
  }
}

interface CacheEntry {
  manifest: Manifest;
  etag: string;
}
