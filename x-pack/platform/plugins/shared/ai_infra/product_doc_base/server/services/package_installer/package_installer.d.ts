import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ResourceType } from '@kbn/product-doc-common';
import { type ProductName } from '@kbn/product-doc-common';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import type { ProductDocInstallClient } from '../doc_install_status';
import type { SecurityLabsStatusResponse } from '../doc_manager/types';
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
export declare class PackageInstaller {
    private readonly log;
    private readonly artifactsFolder;
    private readonly esClient;
    private readonly productDocClient;
    private readonly artifactRepositoryUrl;
    private readonly artifactRepositoryProxyUrl?;
    private readonly currentVersion;
    private readonly elserInferenceId;
    private readonly isServerless;
    constructor({ artifactsFolder, logger, esClient, productDocClient, artifactRepositoryUrl, artifactRepositoryProxyUrl, elserInferenceId, kibanaVersion, isServerless, }: PackageInstallerOpts);
    private getInferenceInfo;
    /**
     * Make sure that the currently installed doc packages are up to date.
     * Will not upgrade products that are not already installed
     */
    ensureUpToDate(params: {
        inferenceId: string;
        forceUpdate?: boolean;
    }): Promise<void>;
    installAll(params?: {
        inferenceId?: string;
    }): Promise<void>;
    private installPackageWithVersionFallback;
    installPackage({ productName, productVersion, customInference, }: {
        productName: ProductName;
        productVersion: string;
        customInference?: InferenceInferenceEndpointInfo;
    }): Promise<void>;
    uninstallPackage({ productName, inferenceId, }: {
        productName: ProductName;
        inferenceId?: string;
    }): Promise<void>;
    uninstallAll(params?: {
        inferenceId?: string;
        resourceType?: ResourceType;
    }): Promise<void>;
    /**
     * Install Security Labs content from the CDN.
     */
    installSecurityLabs({ version, inferenceId, }: {
        version?: string;
        inferenceId?: string;
    }): Promise<void>;
    /**
     * Uninstall Security Labs content.
     */
    uninstallSecurityLabs({ inferenceId }: {
        inferenceId?: string;
    }): Promise<void>;
    /**
     * Get the installation status of Security Labs content.
     */
    getSecurityLabsStatus({ inferenceId, }: {
        inferenceId?: string;
    }): Promise<SecurityLabsStatusResponse>;
    /**
     * Ensure Security Labs content is up to date, if currently installed.
     */
    ensureSecurityLabsUpToDate(params: {
        inferenceId: string;
        forceUpdate?: boolean;
    }): Promise<void>;
    /**
     * Install OpenAPI Spec content from the artifact repository.
     */
    installOpenAPISpec({ version, inferenceId, }: {
        version?: string;
        inferenceId?: string;
    }): Promise<void>;
    private findInstallableProductVersion;
    private findInstallableOpenApiVersion;
    private getOpenApiArtifactFileName;
    private ensureArtifactArchiveAvailable;
    private fetchArtifactVersionsWithRetry;
    uninstallOpenAPISpec({ inferenceId }: {
        inferenceId?: string;
    }): Promise<void>;
    private indexContentFile;
    private rewriteInferenceId;
    /**
     * Get the installation status of OpenAPI Spec content.
     */
    getOpenApiSpecStatus({ inferenceId, }: {
        inferenceId?: string;
    }): Promise<SecurityLabsStatusResponse>;
}
export {};
