/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';

import type { ListResult } from '../../../common/types';

import { ArtifactsClientAccessDeniedError, ArtifactsClientError } from '../../errors';

import type {
  Artifact,
  ArtifactsClientCreateOptions,
  ArtifactEncodedMetadata,
  ArtifactsClientInterface,
  NewArtifact,
  ListArtifactsProps,
  FetchAllArtifactsOptions,
} from './types';
import { relativeDownloadUrlFromArtifact, uniqueIdFromId } from './mappings';

import {
  createArtifact,
  deleteArtifact,
  encodeArtifactContent,
  generateArtifactContentHash,
  getArtifact,
  listArtifacts,
  bulkCreateArtifacts,
  bulkDeleteArtifacts,
  fetchAllArtifacts,
} from './artifacts';

/**
 * Exposes an interface for access artifacts from within the context of a single integration (`packageName`)
 */
export class FleetArtifactsClient implements ArtifactsClientInterface {
  constructor(private esClient: ElasticsearchClient, private packageName: string) {
    if (!packageName) {
      throw new ArtifactsClientError('packageName is required');
    }
  }

  private validate(artifact: Artifact): Artifact {
    if (artifact.packageName !== this.packageName) {
      throw new ArtifactsClientAccessDeniedError(artifact.packageName, this.packageName);
    }

    return artifact;
  }

  /**
   * Creates a `kuery` string using the provided value on input that is bound to the integration package
   * @param kuery
   * @private
   */
  private buildFilter(kuery: string): string {
    return `(package_name: "${this.packageName}")${kuery ? ` AND ${kuery}` : ''}`;
  }

  async getArtifact(id: string): Promise<Artifact | undefined> {
    const artifact = await getArtifact(this.esClient, id);
    return artifact ? this.validate(artifact) : undefined;
  }

  /**
   * Creates a new artifact. Content will be compress and stored in binary form.
   */
  async createArtifact({
    content,
    type = '',
    identifier = this.packageName,
  }: ArtifactsClientCreateOptions): Promise<Artifact> {
    const encodedMetaData = await this.encodeContent(content);
    const newArtifactData: NewArtifact = {
      type,
      identifier,
      packageName: this.packageName,
      encryptionAlgorithm: 'none',
      relative_url: relativeDownloadUrlFromArtifact({
        identifier,
        decodedSha256: encodedMetaData.decodedSha256,
      }),
      ...encodedMetaData,
    };

    return createArtifact(this.esClient, newArtifactData);
  }

  async bulkCreateArtifacts(
    optionsList: ArtifactsClientCreateOptions[]
  ): Promise<{ artifacts?: Artifact[]; errors?: Error[] }> {
    const newArtifactsData = [];

    for (const options of optionsList) {
      const { content, type = '', identifier = this.packageName } = options;

      const encodedMetaData = await this.encodeContent(content);
      const newArtifactData: NewArtifact = {
        type,
        identifier,
        packageName: this.packageName,
        encryptionAlgorithm: 'none',
        relative_url: relativeDownloadUrlFromArtifact({
          identifier,
          decodedSha256: encodedMetaData.decodedSha256,
        }),
        ...encodedMetaData,
      };
      newArtifactsData.push(newArtifactData);
    }

    return bulkCreateArtifacts(this.esClient, newArtifactsData);
  }

  async deleteArtifact(id: string) {
    // get the artifact first, which will also ensure its validated
    const artifact = await this.getArtifact(id);

    if (artifact) {
      await deleteArtifact(this.esClient, id);
    }
  }

  async bulkDeleteArtifacts(ids: string[]): Promise<Error[]> {
    const idsMappedWithPackageName = ids.map((id) => uniqueIdFromId(id, this.packageName));
    return await bulkDeleteArtifacts(this.esClient, idsMappedWithPackageName);
  }

  /**
   * Get a list of artifacts. A few things to note:
   * - if wanting to get ALL artifacts, consider using instead the `fetchAll()` method instead
   *   as it will property return data past the 10k ES limitation
   * - when using the `kuery` filtering param, all filters property names should match the
   *   internal attribute names in the index
   */
  async listArtifacts({ kuery, ...options }: ListArtifactsProps = {}): Promise<
    ListResult<Artifact>
  > {
    return listArtifacts(this.esClient, {
      ...options,
      kuery: this.buildFilter(kuery),
    });
  }

  /**
   * Returns an `AsyncIterable` object that can be used to iterate over all artifacts
   *
   * @param options
   *
   * @example
   * async () => {
   *   for await (const artifacts of fleetArtifactsClient.fetchAll()) {
   *     // artifacts === first page of items
   *   }
   * }
   */
  fetchAll({ kuery, ...options }: FetchAllArtifactsOptions = {}): AsyncIterable<Artifact[]> {
    return fetchAllArtifacts(this.esClient, {
      ...options,
      kuery: this.buildFilter(kuery),
    });
  }

  generateHash(content: string): string {
    return generateArtifactContentHash(content);
  }

  async encodeContent(
    content: ArtifactsClientCreateOptions['content']
  ): Promise<ArtifactEncodedMetadata> {
    return encodeArtifactContent(content);
  }
}
