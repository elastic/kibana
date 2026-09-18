/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ResourceType } from '@kbn/product-doc-common';
import Semver from 'semver';
import { getSafePath } from '@kbn/fs';
import {
  getArtifactName,
  getProductDocIndexName,
  getSecurityLabsArtifactName,
  getSecurityLabsIndexName,
  DocumentationProduct,
  type ProductName,
  ResourceTypes,
} from '@kbn/product-doc-common';
import { defaultInferenceEndpoints, InferenceEndpointProvider } from '@kbn/inference-common';
import { cloneDeep } from 'lodash';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { isImpliedDefaultElserInferenceId } from '@kbn/product-doc-common/src/is_default_inference_endpoint';
import type { ProductDocInstallClient } from '../doc_install_status';
import type { SecurityLabsStatusResponse } from '../doc_manager/types';
import {
  downloadToDisk,
  openZipArchive,
  loadMappingFile,
  loadManifestFile,
  ensureDefaultElserDeployed,
  type ZipArchive,
  ensureInferenceDeployed,
  isLegacySemanticTextVersion,
  checkArtifactAvailable,
  ArtifactNotFoundError,
  resolveArtifactsFolderPath,
  removeArtifactFile,
  logArtifactsFolderUsage,
  purgeArtifactsFolder,
} from './utils';
import { majorMinor, latestVersion } from './utils/semver';
import {
  validateArtifactArchive,
  validateOpenApiArtifactArchive,
  fetchArtifactVersions,
  fetchSecurityLabsVersions,
  createIndex,
  populateIndex,
} from './steps';

import { overrideInferenceSettings } from './steps/create_index';
import { LATEST_PRODUCT_VERSION } from '../../../common/consts';
import type { InstallationStatus } from '../../../common/install_status';
interface PackageInstallerOpts {
  artifactsFolder: string;
  logger: Logger;
  esClient: ElasticsearchClient;
  productDocClient: ProductDocInstallClient;
  artifactRepositoryUrl: string;
  artifactRepositoryProxyUrl?: string;
  kibanaVersion: string;
  elserInferenceId?: string;
  isServerless?: boolean;
}
// Process each product (elasticsearch and kibana)
const OPEN_API_SPEC_PRODUCTS: Array<{
  productName: 'elasticsearch' | 'kibana';
  indexName: string;
}> = [
  {
    productName: DocumentationProduct.elasticsearch as 'elasticsearch',
    indexName: '.kibana_ai_openapi_spec_elasticsearch',
  },
  {
    productName: DocumentationProduct.kibana as 'kibana',
    indexName: '.kibana_ai_openapi_spec_kibana',
  },
];

export class PackageInstaller {
  private readonly log: Logger;
  private readonly artifactsFolder: string;
  private readonly artifactsFolderPath: string;
  private readonly esClient: ElasticsearchClient;
  private readonly productDocClient: ProductDocInstallClient;
  private readonly artifactRepositoryUrl: string;
  private readonly artifactRepositoryProxyUrl?: string;
  private readonly currentVersion: string;
  private readonly elserInferenceId: string;
  private readonly isServerless: boolean;

  constructor({
    artifactsFolder,
    logger,
    esClient,
    productDocClient,
    artifactRepositoryUrl,
    artifactRepositoryProxyUrl,
    elserInferenceId,
    kibanaVersion,
    isServerless,
  }: PackageInstallerOpts) {
    this.esClient = esClient;
    this.productDocClient = productDocClient;
    this.artifactsFolder = artifactsFolder;
    this.artifactsFolderPath = resolveArtifactsFolderPath(artifactsFolder);
    this.artifactRepositoryUrl = artifactRepositoryUrl;
    this.artifactRepositoryProxyUrl = artifactRepositoryProxyUrl;
    this.currentVersion = majorMinor(kibanaVersion);
    this.log = logger;
    this.elserInferenceId = elserInferenceId || defaultInferenceEndpoints.ELSER;
    this.isServerless = isServerless ?? false;
  }

  /**
   * Deletes artifact files left behind by a previous process lifetime or a failed install.
   */
  async purgeArtifactsFolder(): Promise<void> {
    await purgeArtifactsFolder(this.artifactsFolderPath, this.log);
  }

  // The existing index is only replaced once the new archive has been downloaded and validated
  private async deleteIndex(indexName: string): Promise<void> {
    await this.esClient.indices.delete({ index: indexName }, { ignore: [404] });
  }

  private async cleanupArtifact(artifactFullPath: string | undefined): Promise<void> {
    if (artifactFullPath) {
      await removeArtifactFile(artifactFullPath, this.log);
    }
    await logArtifactsFolderUsage(this.artifactsFolderPath, this.log);
  }

  private getArtifactRepositoryOptions(): {
    artifactRepositoryUrl: string;
    artifactRepositoryProxyUrl?: string;
  } {
    return {
      artifactRepositoryUrl: this.artifactRepositoryUrl,
      artifactRepositoryProxyUrl: this.artifactRepositoryProxyUrl,
    };
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
   * Makes sure the inference endpoint backing an installation is ready. On serverless only
   * Elastic Inference Service endpoints are allowed; they are hosted, so nothing is deployed.
   */
  private async ensureInferenceEndpointReady({
    inferenceId,
    endpoint,
  }: {
    inferenceId: string;
    endpoint?: InferenceInferenceEndpointInfo;
  }): Promise<void> {
    if (this.isServerless) {
      const resolvedEndpoint = endpoint ?? (await this.getInferenceInfo(inferenceId));
      if (resolvedEndpoint?.service !== InferenceEndpointProvider.Elastic) {
        throw new Error(
          `Inference ID [${inferenceId}] is not an Elastic Inference Service endpoint. Only EIS endpoints are supported on serverless; ML node models cannot be used.`
        );
      }
      return;
    }

    if (inferenceId === defaultInferenceEndpoints.ELSER) {
      await ensureDefaultElserDeployed({ client: this.esClient });
      return;
    }
    await ensureInferenceDeployed({ client: this.esClient, inferenceId });
  }

  private assertValidArtifactArchive(
    zipArchive: ZipArchive,
    archivePath: string,
    { openApi = false }: { openApi?: boolean } = {}
  ): void {
    const validationResult = openApi
      ? validateOpenApiArtifactArchive(zipArchive, { archivePath })
      : validateArtifactArchive(zipArchive, { archivePath });
    if (!validationResult.valid) {
      throw new Error(`Artifact archive validation failed: ${validationResult.error}`);
    }
  }

  /**
   * Returns the installed products whose version differs from the version selected for this deployment.
   */
  async getProductsToUpdate(params: {
    inferenceId: string;
    forceUpdate?: boolean;
  }): Promise<ProductName[]> {
    const { inferenceId, forceUpdate } = params;
    const [repositoryVersions, installStatuses] = await Promise.all([
      fetchArtifactVersions(this.getArtifactRepositoryOptions()),
      this.productDocClient.getInstallationStatusOrThrow({ inferenceId }),
    ]);
    const toUpdate: ProductName[] = [];
    Object.entries(installStatuses).forEach(([productName, productState]) => {
      if (productState.status === 'uninstalled') {
        return;
      }
      const availableVersions = repositoryVersions[productName as ProductName];
      if (!availableVersions || !availableVersions.length) {
        return;
      }
      // Serverless/"latest" zip file has a special versioning strategy
      // where we track by last date modified in the bucket
      const selectedVersion = selectVersion(
        this.currentVersion,
        availableVersions,
        this.isServerless
      );
      if (productState.version !== selectedVersion || Boolean(forceUpdate)) {
        this.log.info(
          `Updating product [${productName}] from version [${productState.version}] to version [${selectedVersion}]`
        );
        toUpdate.push(productName as ProductName);
      }
    });
    return toUpdate;
  }

  /**
   * Installs the version of a single product selected for this deployment, falling back to
   * previous versions when the selected artifact is not available. Resolves to `false` when the
   * repository has no version for the product and nothing was installed.
   */
  async installProduct(params: {
    productName: ProductName;
    inferenceId?: string;
  }): Promise<boolean> {
    const { productName, inferenceId } = params;
    const [repositoryVersions, inferenceInfo] = await Promise.all([
      fetchArtifactVersions(this.getArtifactRepositoryOptions()),
      this.getInferenceInfo(inferenceId),
    ]);
    const availableVersions = repositoryVersions[productName];
    if (!availableVersions || !availableVersions.length) {
      this.log.warn(`No version found for product [${productName}]`);
      return false;
    }
    const selectedVersion = selectVersion(
      this.currentVersion,
      availableVersions,
      this.isServerless
    );
    await this.installPackageWithVersionFallback({
      productName,
      selectedVersion,
      availableVersions,
      customInference: inferenceInfo,
    });
    return true;
  }

  /**
   * Installs a product unless another task already installed the selected version after `since`
   * (or an earlier attempt of the same task did), so overlapping installs and retries do not download
   * and rebuild it again. Resolves to whether an install ran.
   */
  async installProductIfNeeded(params: {
    productName: ProductName;
    inferenceId: string;
    since: Date;
  }): Promise<boolean> {
    const { productName, inferenceId, since } = params;
    const [repositoryVersions, installStatuses] = await Promise.all([
      fetchArtifactVersions(this.getArtifactRepositoryOptions()),
      this.productDocClient.getInstallationStatusOrThrow({ inferenceId }),
    ]);
    const availableVersions = repositoryVersions[productName];
    if (!availableVersions?.length) {
      this.log.warn(`No version found for product [${productName}]`);
      return false;
    }
    const productState = installStatuses[productName];
    const selectedVersion = selectVersion(
      this.currentVersion,
      availableVersions,
      this.isServerless
    );
    if (
      productState &&
      !isUpdateNeeded({
        status: productState.status,
        version: productState.version,
        updatedAt: productState.updatedAt,
        selectedVersion,
        forceUpdate: true,
        since,
      })
    ) {
      this.log.info(
        `Skipping install of product [${productName}]: version [${selectedVersion}] was installed after this request`
      );
      return false;
    }
    return this.installProduct({ productName, inferenceId });
  }

  /**
   * Re-installs a product planned for update unless that is no longer needed: it was uninstalled in
   * the meantime, or it already is at the selected version and, for forced updates, was (re)installed
   * after `since` by another task. Resolves to whether an install ran.
   */
  async updateProductIfNeeded(params: {
    productName: ProductName;
    inferenceId: string;
    forceUpdate?: boolean;
    since: Date;
  }): Promise<boolean> {
    const { productName, inferenceId, forceUpdate, since } = params;
    const [repositoryVersions, installStatuses] = await Promise.all([
      fetchArtifactVersions(this.getArtifactRepositoryOptions()),
      this.productDocClient.getInstallationStatusOrThrow({ inferenceId }),
    ]);
    const productState = installStatuses[productName];
    const availableVersions = repositoryVersions[productName];
    if (!productState || productState.status === 'uninstalled' || !availableVersions?.length) {
      this.log.info(
        `Skipping update of product [${productName}]: not installed or no version available`
      );
      return false;
    }
    const selectedVersion = selectVersion(
      this.currentVersion,
      availableVersions,
      this.isServerless
    );
    if (
      !isUpdateNeeded({
        status: productState.status,
        version: productState.version,
        updatedAt: productState.updatedAt,
        selectedVersion,
        forceUpdate,
        since,
      })
    ) {
      this.log.info(`Skipping update of product [${productName}]: already at [${selectedVersion}]`);
      return false;
    }
    return this.installProduct({ productName, inferenceId });
  }

  /**
   * Whether the given resource (product documentation or the OpenAPI spec) of this inference ID was
   * uninstalled after `since`, meaning an uninstall request superseded the task that started at `since`.
   * Status read failures are propagated so that they are not mistaken for an uninstall.
   */
  async wasUninstalledSince(params: {
    inferenceId: string;
    since: Date;
    resourceType: typeof ResourceTypes.productDoc | typeof ResourceTypes.openapiSpec;
  }): Promise<boolean> {
    const { inferenceId, since, resourceType } = params;
    const statuses =
      resourceType === ResourceTypes.openapiSpec
        ? [await this.productDocClient.getOpenapiSpecInstallationStatus({ inferenceId })]
        : Object.values(await this.productDocClient.getInstallationStatusOrThrow({ inferenceId }));
    return statuses.some(
      ({ status, updatedAt }) =>
        (status === 'uninstalled' || status === 'uninstalling') &&
        updatedAt !== undefined &&
        new Date(updatedAt).getTime() > since.getTime()
    );
  }

  /**
   * Installs the OpenAPI spec when the installed version differs from the version selected for this deployment.
   */
  async ensureOpenApiSpecUpToDate(params: {
    inferenceId: string;
    forceUpdate?: boolean;
    /** Forced updates skip a spec another task already (re)installed after this time */
    since?: Date;
  }): Promise<void> {
    const { inferenceId, forceUpdate, since } = params;
    const [repositoryVersions, openapiSpecInstallStatus] = await Promise.all([
      fetchArtifactVersions(this.getArtifactRepositoryOptions()),
      this.productDocClient.getOpenapiSpecInstallationStatus({ inferenceId }),
    ]);
    const openAPISpecVersionToUpgradeTo = selectVersion(
      this.currentVersion,
      repositoryVersions.openapi,
      this.isServerless
    );
    if (
      isUpdateNeeded({
        status: openapiSpecInstallStatus.status,
        version: openapiSpecInstallStatus.version,
        updatedAt: openapiSpecInstallStatus.updatedAt,
        selectedVersion: openAPISpecVersionToUpgradeTo,
        forceUpdate,
        since,
      })
    ) {
      await this.installOpenAPISpec({
        version: openAPISpecVersionToUpgradeTo,
        inferenceId,
      });
    }
  }

  private async installPackageWithVersionFallback({
    productName,
    selectedVersion,
    availableVersions,
    customInference,
  }: {
    productName: ProductName;
    selectedVersion: string;
    availableVersions: string[];
    customInference?: InferenceInferenceEndpointInfo;
  }) {
    const fallbackVersions = getPreviousVersions(selectedVersion, availableVersions);
    const candidateVersions = [selectedVersion, ...fallbackVersions];
    const inferenceId = customInference?.inference_id ?? this.elserInferenceId;
    const installableVersion = await this.findInstallableProductVersion({
      productName,
      candidateVersions,
      inferenceId,
    });

    await this.installPackage({
      productName,
      productVersion: installableVersion,
      customInference,
    });
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

    // Artifact name will always be {doc}-latest.zip,
    // but we store the last modified date in productVersion for tracking (e.g. "latest-2026-01-27T23:25:54.727Z")
    // so that's the artifact product version we will use
    const artifactProductVersion = this.isServerless ? productVersion : majorMinor(productVersion);
    const artifactFileNameVersion = this.isServerless
      ? LATEST_PRODUCT_VERSION
      : majorMinor(productVersion);

    let zipArchive: ZipArchive | undefined;
    let artifactFullPath: string | undefined;
    // The persisted status is only touched once the new archive is ready to replace the index, so a
    // failure before that point leaves an installed version reported as such. A status read failure
    // propagates rather than being mistaken for a fresh install.
    const previousStatus = (
      await this.productDocClient.getInstallationStatusOrThrow({ inferenceId })
    )[productName]?.status;
    let replacing = false;
    try {
      if (
        customInference &&
        !isImpliedDefaultElserInferenceId(customInference.inference_id) &&
        customInference.task_type !== 'text_embedding'
      ) {
        throw new Error(
          `Inference [${inferenceId}]'s task type ${customInference.task_type} is not supported. Please use a model with task type 'text_embedding'.`
        );
      }
      await this.ensureInferenceEndpointReady({ inferenceId, endpoint: customInference });

      const artifactFileName = getArtifactName({
        productName,
        productVersion: artifactFileNameVersion,
        inferenceId: customInference?.inference_id ?? this.elserInferenceId,
      });
      const artifactUrl = `${this.artifactRepositoryUrl}/${artifactFileName}`;
      const artifactPathAtVolume = `${this.artifactsFolder}/${artifactFileName}`;
      // Resolved up front so a failed download still gets cleaned up
      artifactFullPath = getSafePath(artifactPathAtVolume).fullPath;
      this.log.debug(`Downloading from [${artifactUrl}] to [${artifactPathAtVolume}]`);
      artifactFullPath = await downloadToDisk(
        artifactUrl,
        artifactPathAtVolume,
        this.artifactRepositoryProxyUrl
      );

      zipArchive = await openZipArchive(artifactFullPath);
      this.assertValidArtifactArchive(zipArchive, artifactFullPath);

      const [manifest, mappings] = await Promise.all([
        loadManifestFile(zipArchive),
        loadMappingFile(zipArchive),
      ]);

      const manifestVersion = manifest.formatVersion;
      const indexName = getProductDocIndexName(productName, customInference?.inference_id);

      const modifiedMappings = cloneDeep(mappings);
      overrideInferenceSettings(modifiedMappings, inferenceId!);

      replacing = true;
      await this.productDocClient.setInstallationStarted({
        productName,
        productVersion: artifactProductVersion,
        inferenceId,
      });
      await this.deleteIndex(indexName);
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
      if (isArtifactMissingError(e)) {
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

      if (!replacing && previousStatus === 'installed') {
        this.log.warn(
          `Keeping the installed documentation for product [${productName}]: the new version could not be prepared`
        );
      } else {
        await this.productDocClient.setInstallationFailed(productName, message, inferenceId);
      }
      throw e;
    } finally {
      zipArchive?.close();
      await this.cleanupArtifact(artifactFullPath);
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

  async uninstallAll(params: { inferenceId?: string; resourceType?: ResourceType } = {}) {
    const { inferenceId, resourceType } = params;
    const allProducts = Object.values(DocumentationProduct);
    for (const productName of allProducts) {
      await this.productDocClient.setUninstallationStarted(productName, inferenceId);
      await this.uninstallPackage({ productName, inferenceId });
    }
    if (resourceType === ResourceTypes.openapiSpec || !resourceType) {
      await this.uninstallOpenAPISpec({ inferenceId });
    }
  }

  // Security Labs methods

  /**
   * Install Security Labs content from the CDN.
   */
  async installSecurityLabs({
    version,
    inferenceId,
  }: {
    version?: string;
    inferenceId?: string;
  }): Promise<void> {
    const effectiveInferenceId = inferenceId || this.elserInferenceId;

    this.log.info(
      `Starting Security Labs installation${
        version ? ` for version [${version}]` : ''
      } with inference ID [${effectiveInferenceId}]`
    );

    let zipArchive: ZipArchive | undefined;
    let selectedVersion: string | undefined;
    let artifactFullPath: string | undefined;
    const { status: previousStatus } =
      await this.productDocClient.getSecurityLabsInstallationStatus({
        inferenceId: effectiveInferenceId,
      });
    let replacing = false;
    try {
      await this.ensureInferenceEndpointReady({ inferenceId: effectiveInferenceId });

      // Determine version to install
      selectedVersion = version;
      if (!selectedVersion) {
        const availableVersions = await fetchSecurityLabsVersions({
          ...this.getArtifactRepositoryOptions(),
          inferenceId: effectiveInferenceId,
        });
        if (availableVersions.length === 0) {
          throw new Error('No Security Labs versions available');
        }
        // Select the latest version for this inference ID
        selectedVersion = availableVersions.sort().reverse()[0];
      }

      const artifactFileName = getSecurityLabsArtifactName({
        version: selectedVersion,
        inferenceId: effectiveInferenceId,
      });
      const artifactUrl = `${this.artifactRepositoryUrl}/${artifactFileName}`;
      const artifactPath = `${this.artifactsFolder}/${artifactFileName}`;
      artifactFullPath = getSafePath(artifactPath).fullPath;

      this.log.debug(`Downloading Security Labs from [${artifactUrl}] to [${artifactPath}]`);
      artifactFullPath = await downloadToDisk(
        artifactUrl,
        artifactPath,
        this.artifactRepositoryProxyUrl
      );

      zipArchive = await openZipArchive(artifactFullPath);
      this.assertValidArtifactArchive(zipArchive, artifactFullPath);

      const [manifest, mappings] = await Promise.all([
        loadManifestFile(zipArchive),
        loadMappingFile(zipArchive),
      ]);

      const manifestVersion = manifest.formatVersion;
      const indexName = getSecurityLabsIndexName(effectiveInferenceId);

      const modifiedMappings = cloneDeep(mappings);
      overrideInferenceSettings(modifiedMappings, effectiveInferenceId);

      replacing = true;
      await this.productDocClient.setSecurityLabsInstallationStarted({
        version: selectedVersion,
        inferenceId: effectiveInferenceId,
      });
      await this.deleteIndex(indexName);
      await createIndex({
        indexName,
        mappings: modifiedMappings,
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
        inferenceId: effectiveInferenceId,
      });

      await this.productDocClient.setSecurityLabsInstallationSuccessful({
        version: selectedVersion,
        indexName,
        inferenceId: effectiveInferenceId,
      });

      this.log.info(`Security Labs installation successful for version [${selectedVersion}]`);
    } catch (e) {
      let message = e.message;
      if (isArtifactMissingError(e)) {
        message = i18n.translate(
          'aiInfra.productDocBase.packageInstaller.noSecurityLabsArtifactAvailable',
          {
            values: { inferenceId: effectiveInferenceId },
            defaultMessage:
              'No Security Labs artifact available for Inference ID [{inferenceId}]. Please contact your administrator.',
          }
        );
      }
      this.log.error(`Error during Security Labs installation: ${message}`);
      if (!replacing && previousStatus === 'installed') {
        this.log.warn(
          `Keeping the installed Security Labs content: the new version could not be prepared`
        );
      } else {
        await this.productDocClient.setSecurityLabsInstallationFailed({
          version: selectedVersion,
          failureReason: message,
          inferenceId: effectiveInferenceId,
        });
      }
      throw e;
    } finally {
      zipArchive?.close();
      await this.cleanupArtifact(artifactFullPath);
    }
  }

  /**
   * Uninstall Security Labs content.
   */
  async uninstallSecurityLabs({ inferenceId }: { inferenceId?: string }): Promise<void> {
    const indexName = getSecurityLabsIndexName(inferenceId);
    await this.esClient.indices.delete(
      {
        index: indexName,
      },
      { ignore: [404] }
    );
    if (inferenceId) {
      await this.productDocClient.setSecurityLabsUninstalled(inferenceId);
    }
    this.log.info(`Security Labs content uninstalled from index [${indexName}]`);
  }

  /**
   * Get the installation status of Security Labs content.
   */
  async getSecurityLabsStatus({
    inferenceId,
  }: {
    inferenceId?: string;
  }): Promise<SecurityLabsStatusResponse> {
    try {
      const effectiveInferenceId = inferenceId ?? this.elserInferenceId;
      const status = await this.productDocClient.getSecurityLabsInstallationStatus({
        inferenceId: effectiveInferenceId,
      });

      // Compute latest version (best-effort) for UX and auto-update checks.
      let repoLatestVersion: string | undefined;
      try {
        const versions = await fetchSecurityLabsVersions({
          ...this.getArtifactRepositoryOptions(),
          inferenceId: effectiveInferenceId,
        });
        if (versions.length > 0) {
          repoLatestVersion = versions.slice().sort().reverse()[0];
        }
      } catch (e) {
        // ignore
      }

      const installedVersion = status.version;
      const isUpdateAvailable =
        status.status === 'installed' &&
        Boolean(installedVersion) &&
        Boolean(repoLatestVersion) &&
        installedVersion !== repoLatestVersion;

      // If we have a saved-object based status, return it (augmented with update info).
      // (Backwards compatibility: if not found, fall back to index existence checks below.)
      if (status.status !== 'uninstalled' || status.version || status.failureReason) {
        return { ...status, latestVersion: repoLatestVersion, isUpdateAvailable };
      }

      const indexName = getSecurityLabsIndexName(effectiveInferenceId);
      const exists = await this.esClient.indices.exists({ index: indexName });
      if (!exists) return { status: 'uninstalled' };

      const countResponse = await this.esClient.count({ index: indexName });
      if (countResponse.count === 0) return { status: 'uninstalled' };

      // Unknown version (legacy install), but installed.
      return { status: 'installed', latestVersion: repoLatestVersion };
    } catch (error) {
      this.log.error(`Error checking Security Labs status: ${error.message}`);
      return {
        status: 'error',
        failureReason: error.message,
      };
    }
  }

  /**
   * Ensure Security Labs content is up to date, if currently installed.
   */
  async ensureSecurityLabsUpToDate(params: { inferenceId: string; forceUpdate?: boolean }) {
    const { inferenceId, forceUpdate } = params;
    const status = await this.productDocClient.getSecurityLabsInstallationStatus({ inferenceId });
    if (status.status !== 'installed') {
      return;
    }

    const availableVersions = await fetchSecurityLabsVersions({
      ...this.getArtifactRepositoryOptions(),
      inferenceId,
    });
    if (availableVersions.length === 0) {
      return;
    }
    const latest = availableVersions.sort().reverse()[0];
    const installedVersion = status.version;

    if (!forceUpdate && installedVersion && installedVersion === latest) {
      return;
    }

    await this.installSecurityLabs({ version: latest, inferenceId });
  }

  // OpenAPI Spec methods

  /**
   * Install OpenAPI Spec content from the artifact repository.
   */
  async installOpenAPISpec({
    version,
    inferenceId,
  }: {
    version?: string;
    inferenceId?: string;
  }): Promise<void> {
    const effectiveInferenceId = inferenceId || this.elserInferenceId;
    const selectedVersion = version || this.currentVersion;
    const stackVersion = await this.findInstallableOpenApiVersion({
      selectedVersion,
      inferenceId: effectiveInferenceId,
      explicitVersionProvided: Boolean(version),
    });

    this.log.info(
      `Starting OpenAPI Spec installation for version [${stackVersion}] with inference ID [${effectiveInferenceId}]`
    );

    let zipArchive: ZipArchive | undefined;
    let artifactFullPath: string | undefined;
    const { status: previousStatus } = await this.productDocClient.getOpenapiSpecInstallationStatus(
      { inferenceId: effectiveInferenceId }
    );
    let replacing = false;
    try {
      await this.ensureInferenceEndpointReady({ inferenceId: effectiveInferenceId });
      const artifactFileName = this.getOpenApiArtifactFileName({
        stackVersion,
        inferenceId: effectiveInferenceId,
      });
      const artifactUrl = `${this.artifactRepositoryUrl}/${artifactFileName}`;
      const artifactPath = `${this.artifactsFolder}/${artifactFileName}`;
      artifactFullPath = getSafePath(artifactPath).fullPath;

      this.log.debug(`Downloading OpenAPI artifact from [${artifactUrl}] to [${artifactPath}]`);
      artifactFullPath = await downloadToDisk(
        artifactUrl,
        artifactPath,
        this.artifactRepositoryProxyUrl
      );

      zipArchive = await openZipArchive(artifactFullPath);
      this.assertValidArtifactArchive(zipArchive, artifactFullPath, { openApi: true });

      for (const { productName, indexName: unmodifiedIndexName } of OPEN_API_SPEC_PRODUCTS) {
        this.log.info(`Installing OpenAPI spec for ${productName}`);

        replacing = true;
        await this.productDocClient.setOpenapiSpecInstallationStarted({
          productName,
          productVersion: stackVersion,
          inferenceId: effectiveInferenceId,
        });

        // Load manifest and mappings from product folder
        const manifestPath = `${productName}/manifest.json`;
        const mappingsPath = `${productName}/mappings.json`;

        if (!zipArchive.hasEntry(manifestPath) || !zipArchive.hasEntry(mappingsPath)) {
          throw new Error(
            `Missing required files for ${productName}: ${manifestPath} or ${mappingsPath} not found in archive`
          );
        }

        const [manifestBuffer, mappingsBuffer] = await Promise.all([
          zipArchive.getEntryContent(manifestPath),
          zipArchive.getEntryContent(mappingsPath),
        ]);

        const manifest = JSON.parse(manifestBuffer.toString('utf-8'));
        const mappings = JSON.parse(mappingsBuffer.toString('utf-8'));

        const manifestVersion = manifest.formatVersion;
        const modifiedMappings = cloneDeep(mappings);
        overrideInferenceSettings(modifiedMappings, effectiveInferenceId);

        const indexName = `${unmodifiedIndexName}${
          !isImpliedDefaultElserInferenceId(effectiveInferenceId) ? `-${effectiveInferenceId}` : ''
        }`;
        await this.deleteIndex(indexName);
        await createIndex({
          indexName,
          mappings: modifiedMappings,
          manifestVersion,
          esClient: this.esClient,
          log: this.log,
        });

        // Populate index from product's content folder
        const contentPrefix = `${productName}/content/`;
        const contentEntries = zipArchive
          .getEntryPaths()
          .filter(
            (path) =>
              path.startsWith(contentPrefix) && path.match(/^.*\/content\/content-[0-9]+\.ndjson$/)
          );

        if (contentEntries.length === 0) {
          throw new Error(`No content files found for ${productName} in archive`);
        }

        for (const entryPath of contentEntries) {
          this.log.debug(`Indexing content for entry ${entryPath}`);
          const contentBuffer = await zipArchive.getEntryContent(entryPath);
          await this.indexContentFile({
            indexName,
            esClient: this.esClient,
            contentBuffer,
            manifestVersion,
            inferenceId: effectiveInferenceId,
          });
        }

        await this.productDocClient.setOpenapiSpecInstallationSuccessful({
          productName,
          productVersion: stackVersion,
          indexName,
          inferenceId: effectiveInferenceId,
        });

        this.log.info(`OpenAPI Spec installation successful for ${productName}`);
      }

      this.log.info(`OpenAPI Spec installation successful for version [${stackVersion}]`);
    } catch (e) {
      let message = e.message;
      if (isArtifactMissingError(e)) {
        message = i18n.translate(
          'aiInfra.productDocBase.packageInstaller.noOpenApiSpecArtifactAvailable',
          {
            values: { inferenceId: effectiveInferenceId, version: stackVersion },
            defaultMessage:
              'No OpenAPI Spec artifact available for version [{version}] and Inference ID [{inferenceId}]. Please contact your administrator.',
          }
        );
      }
      this.log.error(`Error during OpenAPI Spec installation: ${message}`);
      if (!replacing && previousStatus === 'installed') {
        this.log.warn(
          `Keeping the installed OpenAPI Spec content: the new version could not be prepared`
        );
      } else {
        // Mark both products as failed
        for (const productName of [
          DocumentationProduct.elasticsearch,
          DocumentationProduct.kibana,
        ]) {
          await this.productDocClient.setOpenapiSpecInstallationFailed({
            productName: productName as 'elasticsearch' | 'kibana',
            productVersion: stackVersion,
            failureReason: message,
            inferenceId: effectiveInferenceId,
          });
        }
      }
      throw e;
    } finally {
      zipArchive?.close();
      await this.cleanupArtifact(artifactFullPath);
    }
  }

  private async indexContentFile({
    indexName,
    esClient,
    contentBuffer,
    manifestVersion,
    inferenceId,
  }: {
    indexName: string;
    esClient: ElasticsearchClient;
    contentBuffer: Buffer;
    manifestVersion: string;
    inferenceId: string;
  }): Promise<void> {
    const legacySemanticText = isLegacySemanticTextVersion(manifestVersion);

    const fileContent = contentBuffer.toString('utf-8');
    const lines = fileContent.split('\n');

    const documents = lines
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line))
      .map((doc) => this.rewriteInferenceId(doc, inferenceId, legacySemanticText));

    const operations: Array<{ index: { _index: string } } | Record<string, any>> = [];
    for (const document of documents) {
      operations.push({ index: { _index: indexName } }, document);
    }

    const response = await esClient.bulk({
      refresh: false,
      operations,
    });

    if (response.errors) {
      const error =
        response.items.find((item) => item.index?.error)?.index?.error ?? 'unknown error';
      throw new Error(`Error indexing documents: ${JSON.stringify(error)}`);
    }
  }

  private rewriteInferenceId(
    document: Record<string, any>,
    inferenceId: string,
    legacySemanticText: boolean
  ): Record<string, any> {
    // Clone the document to avoid mutating the original
    const clonedDoc = { ...document };

    if (legacySemanticText) {
      // For legacy semantic text, modify fields directly on the document
      Object.values(clonedDoc).forEach((field: any) => {
        if (field?.inference) {
          field.inference.inference_id = inferenceId;
        }
      });
    } else {
      // For non-legacy semantic text, modify fields within _inference_fields
      if (clonedDoc._inference_fields) {
        // Clone _inference_fields to avoid mutation issues
        clonedDoc._inference_fields = { ...clonedDoc._inference_fields };
        Object.values(clonedDoc._inference_fields).forEach((field: any) => {
          if (field?.inference) {
            field.inference = { ...field.inference, inference_id: inferenceId };
          }
        });
      }
    }

    return clonedDoc;
  }

  private async findInstallableProductVersion({
    productName,
    candidateVersions,
    inferenceId,
  }: {
    productName: ProductName;
    candidateVersions: string[];
    inferenceId: string;
  }): Promise<string> {
    let lastMissingError: Error | undefined;
    // Several candidate versions can map to the same artifact (e.g. every `latest-<timestamp>`
    // entry on serverless), which must not be downloaded again once it is known to be missing.
    const triedArtifacts = new Set<string>();

    for (const candidateVersion of candidateVersions) {
      const artifactFileNameVersion = this.isServerless
        ? LATEST_PRODUCT_VERSION
        : majorMinor(candidateVersion);
      const artifactFileName = getArtifactName({
        productName,
        productVersion: artifactFileNameVersion,
        inferenceId,
      });
      if (triedArtifacts.has(artifactFileName)) {
        continue;
      }
      triedArtifacts.add(artifactFileName);
      try {
        await this.ensureArtifactAvailable(artifactFileName);
        return candidateVersion;
      } catch (error) {
        if (!isArtifactMissingError(error)) {
          throw error;
        }
        lastMissingError = error as Error;
        if (candidateVersion !== candidateVersions[0]) {
          this.log.warn(
            `Artifact for version [${candidateVersions[0]}] is unavailable for product [${productName}]. Retrying with fallback version [${candidateVersion}]`
          );
        }
      }
    }

    if (lastMissingError) {
      throw lastMissingError;
    }

    throw new Error(`No candidate versions available for product [${productName}]`);
  }

  private async findInstallableOpenApiVersion({
    selectedVersion,
    inferenceId,
    explicitVersionProvided,
  }: {
    selectedVersion: string;
    inferenceId: string;
    explicitVersionProvided: boolean;
  }): Promise<string> {
    const candidateVersions = [selectedVersion];
    let fallbackVersionsLoaded = false;

    if (!explicitVersionProvided) {
      const availableVersions = await this.fetchArtifactVersionsWithRetry();
      candidateVersions.push(...getPreviousVersions(selectedVersion, availableVersions.openapi));
      fallbackVersionsLoaded = true;
    }

    // Several candidate versions can map to the same artifact (every `latest-<timestamp>` entry
    // maps to the single `latest` file), which must not be downloaded again once known missing.
    const triedArtifacts = new Set<string>();
    let lastMissingError: Error | undefined;
    for (let candidateIndex = 0; candidateIndex < candidateVersions.length; candidateIndex++) {
      const stackVersion = candidateVersions[candidateIndex];
      const artifactFileName = this.getOpenApiArtifactFileName({
        stackVersion,
        inferenceId,
      });
      if (triedArtifacts.has(artifactFileName)) {
        continue;
      }
      triedArtifacts.add(artifactFileName);
      try {
        await this.ensureArtifactAvailable(artifactFileName);
        return stackVersion;
      } catch (error) {
        if (!isArtifactMissingError(error)) {
          throw error;
        }
        lastMissingError = error as Error;
        if (explicitVersionProvided && !fallbackVersionsLoaded) {
          try {
            const availableVersions = await this.fetchArtifactVersionsWithRetry();
            candidateVersions.push(
              ...getPreviousVersions(selectedVersion, availableVersions.openapi)
            );
          } catch (fetchError) {
            this.log.warn(
              `Failed to fetch OpenAPI fallback versions after missing explicit version [${selectedVersion}]: ${
                (fetchError as Error).message
              }`
            );
          } finally {
            fallbackVersionsLoaded = true;
          }
        }
        this.log.warn(
          `OpenAPI artifact [${artifactFileName}] for version [${stackVersion}] is unavailable.`
        );
      }
    }

    if (lastMissingError) {
      throw lastMissingError;
    }
    throw new Error(
      `No installable OpenAPI artifact found for selected version [${selectedVersion}]`
    );
  }

  private getOpenApiArtifactFileName({
    stackVersion,
    inferenceId,
  }: {
    stackVersion: string;
    inferenceId: string;
  }): string {
    const inferenceIdSuffix = isImpliedDefaultElserInferenceId(inferenceId)
      ? ''
      : `--${inferenceId}`;
    // `latest-<timestamp>` versions track the upload date of the single `latest` artifact
    const fileVersion =
      extractLatestVersionTimestamp(stackVersion) !== undefined
        ? LATEST_PRODUCT_VERSION
        : stackVersion;
    return `kb-product-doc-openapi-${fileVersion}${inferenceIdSuffix}.zip`;
  }

  // Existence is checked without downloading; the archive itself is validated once installed
  private async ensureArtifactAvailable(artifactFileName: string): Promise<void> {
    await checkArtifactAvailable(
      `${this.artifactRepositoryUrl}/${artifactFileName}`,
      this.artifactRepositoryProxyUrl
    );
  }

  private async fetchArtifactVersionsWithRetry(retries = 3) {
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fetchArtifactVersions(this.getArtifactRepositoryOptions());
      } catch (error) {
        lastError = error as Error;
        if (attempt < retries) {
          await sleep(1000 * attempt);
        }
      }
    }
    throw lastError ?? new Error('Failed to fetch artifact versions');
  }

  async uninstallOpenAPISpec({ inferenceId }: { inferenceId?: string }): Promise<void> {
    for (const { indexName } of OPEN_API_SPEC_PRODUCTS) {
      this.log.info(`Uninstalling OpenAPI Spec from index [${indexName}]`);
      await this.esClient.indices.delete({ index: indexName }, { ignore: [404] });
      await this.productDocClient.setOpenapiSpecUninstalled(inferenceId);
    }
  }

  /**
   * Get the installation status of OpenAPI Spec content.
   */
  async getOpenApiSpecStatus({
    inferenceId,
  }: {
    inferenceId?: string;
  }): Promise<SecurityLabsStatusResponse> {
    try {
      const effectiveInferenceId = inferenceId ?? this.elserInferenceId;
      const status = await this.productDocClient.getOpenapiSpecInstallationStatus({
        inferenceId: effectiveInferenceId,
      });

      return status;
    } catch (error) {
      this.log.error(`Error checking OpenAPI Spec status: ${error.message}`);
      return {
        status: 'error',
        failureReason: error.message,
      };
    }
  }
}

// An item needs (re)installing when its version differs from the selected one, or when the update is
// forced and nobody else has (re)installed it at that version since the forced update was requested
const isUpdateNeeded = ({
  status,
  version,
  updatedAt,
  selectedVersion,
  forceUpdate,
  since,
}: {
  status: InstallationStatus;
  version?: string;
  updatedAt?: string;
  selectedVersion: string;
  forceUpdate?: boolean;
  since?: Date;
}): boolean => {
  if (version !== selectedVersion) {
    return true;
  }
  if (!forceUpdate) {
    return false;
  }
  const refreshedSinceRequest =
    status === 'installed' &&
    since !== undefined &&
    updatedAt !== undefined &&
    new Date(updatedAt).getTime() > since.getTime();
  return !refreshedSinceRequest;
};

const selectVersion = (
  currentVersion: string,
  availableVersions: string[],
  isServerless: boolean
): string => {
  const latestAvailableVersion = availableVersions.includes(currentVersion)
    ? currentVersion
    : latestVersion(availableVersions, currentVersion);

  if (isServerless) {
    // Every `latest-<timestamp>` entry is a `latest` artifact upload; the most recent one wins
    const newestLatestVersion = availableVersions
      .filter((version) => version.includes(LATEST_PRODUCT_VERSION))
      .reduce<string | undefined>((newest, version) => {
        if (!newest) {
          return version;
        }
        const timestamp = extractLatestVersionTimestamp(version) ?? -1;
        return timestamp > (extractLatestVersionTimestamp(newest) ?? -1) ? version : newest;
      }, undefined);
    return newestLatestVersion ?? latestAvailableVersion;
  }
  return latestAvailableVersion;
};

const isArtifactMissingError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  return (
    error instanceof ArtifactNotFoundError ||
    error.name === 'ArtifactNotFoundError' ||
    error.message.includes('End of central directory record signature not found.') ||
    error.message.includes('No such file or directory') ||
    error.message.includes('ENOENT')
  );
};

const getPreviousVersions = (selectedVersion: string, availableVersions: string[]): string[] => {
  const selectedSemver = Semver.coerce(selectedVersion);
  const selectedLatestTimestamp = extractLatestVersionTimestamp(selectedVersion);

  if (selectedLatestTimestamp !== undefined) {
    return availableVersions
      .map((version) => ({
        version,
        timestamp: extractLatestVersionTimestamp(version),
      }))
      .filter(
        (candidate): candidate is { version: string; timestamp: number } =>
          candidate.timestamp !== undefined && candidate.timestamp < selectedLatestTimestamp
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((candidate) => candidate.version);
  }

  if (!selectedSemver) {
    return [];
  }

  return availableVersions
    .filter((version) => {
      const versionSemver = Semver.coerce(version);
      return Boolean(versionSemver && Semver.lt(versionSemver, selectedSemver));
    })
    .sort((a, b) => Semver.rcompare(Semver.coerce(a)!, Semver.coerce(b)!));
};

const extractLatestVersionTimestamp = (version: string): number | undefined => {
  const latestWithTimestampMatch = version.match(/^latest-(.+)$/);
  if (!latestWithTimestampMatch) {
    return undefined;
  }
  const timestamp = Date.parse(latestWithTimestampMatch[1]);
  return Number.isNaN(timestamp) ? undefined : timestamp;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
