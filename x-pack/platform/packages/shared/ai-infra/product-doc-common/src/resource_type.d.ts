/**
 * Resource types for knowledge base artifacts.
 * - `product_doc`: Elastic product documentation (Kibana, Elasticsearch, etc.)
 * - `security_labs`: Elastic Security Labs content
 */
export type ResourceType = 'product_doc' | 'security_labs' | 'openapi_spec';
export declare const ResourceTypes: {
    readonly productDoc: "product_doc";
    readonly securityLabs: "security_labs";
    readonly openapiSpec: "openapi_spec";
};
