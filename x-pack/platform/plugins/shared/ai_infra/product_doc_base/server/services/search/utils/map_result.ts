/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { resolveContentTitle, type ProductDocumentationAttributes } from '@kbn/product-doc-common';
import type { DocSearchResult } from '../types';

export const mapResult = (docHit: SearchHit<ProductDocumentationAttributes>): DocSearchResult => {
  const content = docHit._source!.content_body;
  const contentText = typeof content === 'string' ? content : content.text;
  return {
    title: resolveContentTitle(docHit._source!.content_title, contentText),
    content: contentText,
    url: docHit._source!.url,
    productName: docHit._source!.product_name,
    highlights: docHit.highlight?.content_body ?? [],
  };
};
