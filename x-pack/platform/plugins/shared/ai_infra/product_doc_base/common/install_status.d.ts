import type { ProductName } from '@kbn/product-doc-common';
export type InstallationStatus = 'installed' | 'uninstalled' | 'installing' | 'uninstalling' | 'error';
/**
 * DTO representation of the product doc install status SO
 */
export interface ProductDocInstallStatus {
    id: string;
    productName: ProductName;
    productVersion: string;
    installationStatus: InstallationStatus;
    lastInstallationDate: Date | undefined;
    lastInstallationFailureReason: string | undefined;
    indexName?: string;
    inferenceId?: string;
}
export interface ProductInstallState {
    status: InstallationStatus;
    version?: string;
    failureReason?: string;
}
