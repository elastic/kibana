import type { SavedObjectsClientContract } from '@kbn/core/server';
import { type ProductName } from '@kbn/product-doc-common';
import type { Logger } from '@kbn/logging';
import type { ProductInstallState } from '../../../common/install_status';
import type { SecurityLabsStatusResponse } from '../doc_manager/types';
export declare class ProductDocInstallClient {
    private soClient;
    private log;
    constructor({ soClient, log }: {
        soClient: SavedObjectsClientContract;
        log: Logger;
    });
    getPreviouslyInstalledInferenceIds(): Promise<string[]>;
    getPreviouslyInstalledSecurityLabsInferenceIds(): Promise<string[]>;
    getInstallationStatus({ inferenceId, }: {
        inferenceId: string;
    }): Promise<Record<ProductName, ProductInstallState>>;
    setInstallationStarted(fields: {
        productName: ProductName;
        productVersion: string;
        inferenceId: string | undefined;
    }): Promise<void>;
    setUninstallationStarted(productName: ProductName, inferenceId: string | undefined): Promise<void>;
    setInstallationSuccessful(productName: ProductName, indexName: string, inferenceId: string | undefined): Promise<void>;
    setInstallationFailed(productName: ProductName, failureReason: string, inferenceId: string | undefined): Promise<void>;
    setUninstalled(productName: ProductName, inferenceId: string | undefined): Promise<void>;
    getSecurityLabsInstallationStatus({ inferenceId, }: {
        inferenceId: string;
    }): Promise<SecurityLabsStatusResponse>;
    setSecurityLabsInstallationStarted(fields: {
        version: string;
        inferenceId: string;
    }): Promise<void>;
    setSecurityLabsInstallationSuccessful(fields: {
        version: string;
        indexName: string;
        inferenceId: string;
    }): Promise<void>;
    setSecurityLabsInstallationFailed(fields: {
        version?: string;
        failureReason: string;
        inferenceId: string;
    }): Promise<void>;
    setSecurityLabsUninstalled(inferenceId: string): Promise<void>;
    getOpenapiSpecInstallationStatus({ inferenceId, }: {
        inferenceId: string;
    }): Promise<SecurityLabsStatusResponse>;
    setOpenapiSpecInstallationStarted(fields: {
        productName: 'kibana' | 'elasticsearch';
        productVersion: string;
        inferenceId: string;
    }): Promise<void>;
    setOpenapiSpecInstallationSuccessful(fields: {
        productName: 'kibana' | 'elasticsearch';
        productVersion: string;
        indexName: string;
        inferenceId: string;
    }): Promise<void>;
    setOpenapiSpecInstallationFailed(fields: {
        productName: 'kibana' | 'elasticsearch';
        productVersion: string;
        failureReason: string;
        inferenceId: string;
    }): Promise<void>;
    setOpenapiSpecUninstalled(inferenceId: string | undefined): Promise<void>;
}
