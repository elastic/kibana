import type { Logger } from '@kbn/logging';
import { type OutputAPI } from '@kbn/inference-common';
import type { ProductDocSearchAPI } from '@kbn/product-doc-base-plugin/server';
import type { RetrieveDocumentationAPI } from './types';
export declare const retrieveDocumentation: ({ outputAPI, searchDocAPI, logger: log, }: {
    outputAPI: OutputAPI;
    searchDocAPI: ProductDocSearchAPI;
    logger: Logger;
}) => RetrieveDocumentationAPI;
