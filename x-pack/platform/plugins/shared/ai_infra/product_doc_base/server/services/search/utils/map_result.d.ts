import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { ProductDocumentationAttributes } from '@kbn/product-doc-common';
import type { DocSearchResult } from '../types';
export declare const mapResult: (docHit: SearchHit<ProductDocumentationAttributes>) => DocSearchResult;
