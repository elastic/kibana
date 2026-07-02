import type { ElasticsearchClient } from '@kbn/core/server';
import type { ProductDocumentationAttributes } from '@kbn/product-doc-common';
import type { OpenAPIV3 } from 'openapi-types';
export declare const performSearch: ({ searchQuery, size, highlights, index, client, }: {
    searchQuery: string;
    size: number;
    highlights: number;
    index: string | string[];
    client: ElasticsearchClient;
}) => Promise<import("@elastic/elasticsearch/lib/api/types").SearchHit<ProductDocumentationAttributes>[]>;
interface SecurityLabsAttributes {
    title: string;
    slug: string;
    content?: string | {
        text: string;
    };
    description?: string | {
        text: string;
    };
    authors?: string;
    categories?: string[];
    date?: string;
    resource_type?: string;
}
export declare const performSecurityLabsSearch: ({ searchQuery, size, highlights, index, client, }: {
    searchQuery: string;
    size: number;
    highlights: number;
    index: string;
    client: ElasticsearchClient;
}) => Promise<import("@elastic/elasticsearch/lib/api/types").SearchHit<SecurityLabsAttributes>[]>;
export interface OpenapiSpecAttributes extends OpenAPIV3.OperationObject {
    path: string;
    method: OpenAPIV3.HttpMethods;
    endpoint: string;
}
export declare const performOpenapiSpecSearch: ({ searchQuery, size, highlights, index, client, }: {
    searchQuery: string;
    size: number;
    highlights: number;
    index: string;
    client: ElasticsearchClient;
}) => Promise<import("@elastic/elasticsearch/lib/api/types").SearchHit<OpenapiSpecAttributes>[]>;
export {};
