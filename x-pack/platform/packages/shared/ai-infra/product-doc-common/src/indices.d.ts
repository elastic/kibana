import type { ProductName } from './product';
export declare const productDocIndexPrefix = ".kibana_ai_product_doc";
export declare const productDocIndexPattern = ".kibana_ai_product_doc_*";
export declare const getProductDocIndexName: (productName: ProductName, inferenceId?: string) => string;
/**
 * Index name prefix for Security Labs content.
 */
export declare const securityLabsIndexPrefix = ".kibana_ai_security_labs";
/**
 * Index pattern for Security Labs content.
 */
export declare const securityLabsIndexPattern = ".kibana_ai_security_labs*";
/**
 * Returns the index name for Security Labs content.
 * Format: .kibana_ai_security_labs[-{inferenceId}]
 */
export declare const getSecurityLabsIndexName: (inferenceId?: string) => string;
/**
 * Index name prefix for OpenAPI Spec content.
 */
export declare const openApiSpecIndexPrefix = ".kibana_ai_openapi_spec";
/**
 * Index pattern for OpenAPI Spec content.
 */
export declare const openApiSpecIndexPattern = ".kibana_ai_openapi_spec*";
/**
 * Returns the index name for OpenAPI Spec content.
 * Format: .kibana_ai_openapi_spec[-{inferenceId}]
 */
export declare const getOpenApiSpecIndexName: (inferenceId?: string) => string;
