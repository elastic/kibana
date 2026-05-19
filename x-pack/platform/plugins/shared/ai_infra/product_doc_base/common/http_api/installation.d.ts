import type { ProductName, ResourceType } from '@kbn/product-doc-common';
import type { ProductInstallState, InstallationStatus } from '../install_status';
export declare const INSTALLATION_STATUS_API_PATH = "/internal/product_doc_base/status";
export declare const INSTALL_ALL_API_PATH = "/internal/product_doc_base/install";
export declare const UNINSTALL_ALL_API_PATH = "/internal/product_doc_base/uninstall";
export declare const UPDATE_ALL_API_PATH = "/internal/product_doc_base/update_all";
export interface InstallationStatusResponse {
    inferenceId: string;
    overall: InstallationStatus;
    perProducts: Record<ProductName, ProductInstallState>;
    /** Resource type for this installation status */
    resourceType?: ResourceType;
    openApiStatus?: OpenAPISpecInstallStatusResponse;
}
export interface PerformInstallResponse {
    installed: boolean;
    failureReason?: string;
}
export interface PerformUpdateResponse {
    installed: boolean;
    failureReason?: string;
}
export interface UninstallResponse {
    success: boolean;
}
export interface ProductDocInstallParams {
    inferenceId: string | undefined;
    /**
     * Resource type to install/uninstall.
     * - 'product_doc': Elastic product documentation (default)
     * - 'security_labs': Elastic Security Labs content
     */
    resourceType?: ResourceType;
}
export interface BaseInstallStatusResponse<T extends ResourceType> {
    inferenceId: string;
    resourceType: T;
    status: InstallationStatus;
    version?: string;
    latestVersion?: string;
    isUpdateAvailable?: boolean;
    failureReason?: string;
}
export type OpenAPISpecInstallStatusResponse = BaseInstallStatusResponse<'openapi_spec'>;
export type SecurityLabsInstallStatusResponse = BaseInstallStatusResponse<'security_labs'>;
