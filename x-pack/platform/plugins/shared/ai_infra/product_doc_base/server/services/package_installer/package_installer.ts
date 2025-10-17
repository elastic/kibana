/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  getArtifactName,
  getProductDocIndexName,
  DocumentationProduct,
  type ProductName,
} from '@kbn/product-doc-common';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { cloneDeep } from 'lodash';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { isImpliedDefaultElserInferenceId } from '@kbn/product-doc-common/src/is_default_inference_endpoint';
import type { ProductDocInstallClient } from '../doc_install_status';
import {
  downloadToDisk,
  openZipArchive,
  loadMappingFile,
  loadManifestFile,
  ensureDefaultElserDeployed,
  type ZipArchive,
  ensureInferenceDeployed,
} from './utils';
import { majorMinor, latestVersion } from './utils/semver';
import {
  validateArtifactArchive,
  fetchArtifactVersions,
  createIndex,
  populateIndex,
} from './steps';
import { overrideInferenceSettings } from './steps/create_index';

interface PackageInstallerOpts {
  artifactsFolder: string;
  logger: Logger;
  esClient: ElasticsearchClient;
  productDocClient: ProductDocInstallClient;
  artifactRepositoryUrl: string;
  kibanaVersion: string;
  elserInferenceId?: string;
}

export class PackageInstaller {
  private readonly log: Logger;
  private readonly artifactsFolder: string;
  private readonly esClient: ElasticsearchClient;
  private readonly productDocClient: ProductDocInstallClient;
  private readonly artifactRepositoryUrl: string;
  private readonly currentVersion: string;
  private readonly elserInferenceId: string;

  constructor({
    artifactsFolder,
    logger,
    esClient,
    productDocClient,
    artifactRepositoryUrl,
    elserInferenceId,
    kibanaVersion,
  }: PackageInstallerOpts) {
    this.esClient = esClient;
    this.productDocClient = productDocClient;
    this.artifactsFolder = artifactsFolder;
    this.artifactRepositoryUrl = artifactRepositoryUrl;
    this.currentVersion = majorMinor(kibanaVersion);
    this.log = logger;
    this.elserInferenceId = elserInferenceId || defaultInferenceEndpoints.ELSER;
  }

  private async getInferenceInfo(inferenceId?: string) {
    if (!inferenceId) {
      return;
    }
    const inferenceEndpoints = await this.esClient.inference.get({
      inference_id: inferenceId,
    });
    return Array.isArray(inferenceEndpoints.endpoints) && inferenceEndpoints.endpoints.length > 0
      ? inferenceEndpoints.endpoints[0]
      : undefined;
  }
  /**
   * Make sure that the currently installed doc packages are up to date.
   * Will not upgrade products that are not already installed
   */
  async ensureUpToDate(params: { inferenceId: string; forceUpdate?: boolean }) {
    const { inferenceId, forceUpdate } = params;
    const inferenceInfo = await this.getInferenceInfo(inferenceId);
    const [repositoryVersions, installStatuses] = await Promise.all([
      fetchArtifactVersions({
        artifactRepositoryUrl: this.artifactRepositoryUrl,
      }),
      this.productDocClient.getInstallationStatus({ inferenceId }),
    ]);

    const toUpdate: Array<{
      productName: ProductName;
      productVersion: string;
    }> = [];
    Object.entries(installStatuses).forEach(([productName, productState]) => {
      if (productState.status === 'uninstalled') {
        return;
      }
      const availableVersions = repositoryVersions[productName as ProductName];
      if (!availableVersions || !availableVersions.length) {
        return;
      }
      const selectedVersion = selectVersion(this.currentVersion, availableVersions);
      if (productState.version !== selectedVersion || Boolean(forceUpdate)) {
        toUpdate.push({
          productName: productName as ProductName,
          productVersion: selectedVersion,
        });
      }
    });

    for (const { productName, productVersion } of toUpdate) {
      await this.installPackage({
        productName,
        productVersion,
        customInference: inferenceInfo,
      });
    }
  }

  async installAll(params: { inferenceId?: string } = {}) {
    const { inferenceId } = params;
    const repositoryVersions = await fetchArtifactVersions({
      artifactRepositoryUrl: this.artifactRepositoryUrl,
    });
    const allProducts = Object.values(DocumentationProduct) as ProductName[];
    const inferenceInfo = await this.getInferenceInfo(inferenceId);

    for (const productName of allProducts) {
      const availableVersions = repositoryVersions[productName];
      if (!availableVersions || !availableVersions.length) {
        this.log.warn(`No version found for product [${productName}]`);
        continue;
      }
      const selectedVersion = selectVersion(this.currentVersion, availableVersions);

      await this.installPackage({
        productName,
        productVersion: selectedVersion,
        customInference: inferenceInfo,
      });
    }
  }

  async installPackage({
    productName,
    productVersion,
    customInference,
  }: {
    productName: ProductName;
    productVersion: string;
    customInference?: InferenceInferenceEndpointInfo;
  }) {
    const inferenceId = customInference?.inference_id ?? this.elserInferenceId;

    this.log.info(
      `Starting installing documentation for product [${productName}] and version [${productVersion}] with inference ID [${inferenceId}]`
    );

    productVersion = majorMinor(productVersion);

    await this.uninstallPackage({ productName, inferenceId });

    let zipArchive: ZipArchive | undefined;
    try {
      await this.productDocClient.setInstallationStarted({
        productName,
        productVersion,
        inferenceId,
      });

      if (customInference && !isImpliedDefaultElserInferenceId(customInference?.inference_id)) {
        if (customInference?.task_type !== 'text_embedding') {
          throw new Error(
            `Inference [${inferenceId}]'s task type ${customInference?.task_type} is not supported. Please use a model with task type 'text_embedding'.`
          );
        }
        await ensureInferenceDeployed({
          client: this.esClient,
          inferenceId,
        });
      }

      if (!customInference || isImpliedDefaultElserInferenceId(customInference?.inference_id)) {
        await ensureDefaultElserDeployed({
          client: this.esClient,
        });
      }

      const artifactFileName = getArtifactName({
        productName,
        productVersion,
        inferenceId: customInference?.inference_id ?? this.elserInferenceId,
      });
      const artifactUrl = `${this.artifactRepositoryUrl}/${artifactFileName}`;
      const artifactPath = `${this.artifactsFolder}/${artifactFileName}`;

      this.log.debug(`Downloading from [${artifactUrl}] to [${artifactPath}]`);
      await downloadToDisk(artifactUrl, artifactPath);

      zipArchive = await openZipArchive(artifactPath);
      validateArtifactArchive(zipArchive);

      const [manifest, mappings] = await Promise.all([
        loadManifestFile(zipArchive),
        loadMappingFile(zipArchive),
      ]);

      const manifestVersion = manifest.formatVersion;
      const indexName = getProductDocIndexName(productName, customInference?.inference_id);

      const modifiedMappings = cloneDeep(mappings);
      overrideInferenceSettings(modifiedMappings, inferenceId!);

      await createIndex({
        indexName,
        mappings: modifiedMappings, // Mappings will be overridden by the inference ID and inference type
        manifestVersion,
        esClient: this.esClient,
        log: this.log,
      });

      await populateIndex({
        indexName,
        manifestVersion,
        archive: zipArchive,
        esClient: this.esClient,
        log: this.log,
        inferenceId,
      });
      await this.productDocClient.setInstallationSuccessful(productName, indexName, inferenceId);

      this.log.info(
        `Documentation installation successful for product [${productName}] and version [${productVersion}]`
      );
    } catch (e) {
      let message = e.message;
      if (message.includes('End of central directory record signature not found.')) {
        message = i18n.translate('aiInfra.productDocBase.packageInstaller.noArtifactAvailable', {
          values: {
            productName,
            productVersion,
            inferenceId,
          },
          defaultMessage:
            'No documentation artifact available for product [{productName}]/[{productVersion}] for Inference ID [{inferenceId}]. Please select a different model or contact your administrator.',
        });
      }
      this.log.error(
        `Error during documentation installation of product [${productName}]/[${productVersion}] : ${message}`
      );

      await this.productDocClient.setInstallationFailed(productName, message, inferenceId);
      throw e;
    } finally {
      zipArchive?.close();
    }
  }

  async uninstallPackage({
    productName,
    inferenceId,
  }: {
    productName: ProductName;
    inferenceId?: string;
  }) {
    const indexName = getProductDocIndexName(productName, inferenceId);
    await this.esClient.indices.delete(
      {
        index: indexName,
      },
      { ignore: [404] }
    );

    await this.productDocClient.setUninstalled(productName, inferenceId);
  }

  async uninstallAll(params: { inferenceId?: string } = {}) {
    const { inferenceId } = params;
    const allProducts = Object.values(DocumentationProduct);
    for (const productName of allProducts) {
      await this.productDocClient.setUninstallationStarted(productName, inferenceId);
      await this.uninstallPackage({ productName, inferenceId });
    }
  }
}

const selectVersion = (currentVersion: string, availableVersions: string[]): string => {
  return availableVersions.includes(currentVersion)
    ? currentVersion
    : latestVersion(availableVersions, currentVersion);
};
