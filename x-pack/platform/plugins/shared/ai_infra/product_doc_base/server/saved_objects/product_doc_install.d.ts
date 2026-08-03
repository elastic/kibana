import type { SavedObjectsType } from '@kbn/core/server';
import type { ProductName, ResourceType } from '@kbn/product-doc-common';
import type { InstallationStatus } from '../../common/install_status';
/**
 * Interface describing the raw attributes of the product doc install SO type.
 * Contains more fields than the mappings, which only list
 * indexed fields.
 */
export interface ProductDocInstallStatusAttributes {
    product_name: ProductName;
    product_version: string;
    installation_status: InstallationStatus;
    last_installation_date?: number;
    last_installation_failure_reason?: string;
    index_name?: string;
    inference_id?: string;
    /**
     * Resource type: 'product_doc' for product documentation, 'security_labs' for Security Labs content.
     * Defaults to 'product_doc' for backwards compatibility.
     */
    resource_type?: ResourceType;
}
export declare const productDocInstallStatusSavedObjectType: SavedObjectsType<ProductDocInstallStatusAttributes>;
