import { type ProductName, type ResourceType } from '@kbn/product-doc-common';
export declare const getIndicesForProductNames: (productNames: ProductName[] | undefined, inferenceId?: string) => string | string[];
/**
 * Returns the indices to search for the requested resource types.
 */
export declare const getIndicesForResourceTypes: (productNames: ProductName[] | undefined, inferenceId?: string, resourceTypes?: ResourceType[] | undefined) => string | string[];
