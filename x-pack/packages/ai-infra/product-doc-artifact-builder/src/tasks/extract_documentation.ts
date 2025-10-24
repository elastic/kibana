/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as ElasticsearchClient8 } from 'elasticsearch-8.x';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ProductName } from '@kbn/product-doc-common';

/** the list of fields to import from the source cluster */
const fields = [
  'content_title',
  'content_body',
  'product_name', // "Kibana", "Elasticsearch"
  'category', // "documentation"
  'slug',
  'url',
  'version',
  'ai_fields.ai_subtitle',
  'ai_fields.ai_summary',
  'ai_fields.ai_questions_answered',
  'ai_fields.ai_tags',
];

export interface ExtractedDocument {
  content_title: string;
  content_body: string;
  product_name: ProductName;
  root_type: string;
  slug: string;
  url: string;
  version: string;
  ai_subtitle: string;
  ai_summary: string;
  ai_questions_answered: string[];
  ai_tags: string[];
}

const convertHit = (hit: SearchHit<any>, productName: ProductName): ExtractedDocument => {
  const source = hit._source;
  return {
    content_title: source.content_title,
    content_body: source.content_body,
    product_name: productName,
    root_type: 'documentation',
    slug: source.slug,
    url: source.url,
    version: source.version,
    ai_subtitle: source.ai_fields.ai_subtitle,
    ai_summary: source.ai_fields.ai_summary,
    ai_questions_answered: source.ai_fields.ai_questions_answered,
    ai_tags: source.ai_fields.ai_tags,
  };
};

const generateSearchCriteriaForProduct = (productName: ProductName) => {
  if (productName.toLowerCase() === 'elasticsearch') {
    return {
      bool: {
        minimum_should_match: 1,
        should: [
          {
            match_phrase: {
              filename: '*solutions/search*',
            },
          },
          {
            wildcard: {
              product_name: {
                case_insensitive: true,
                value: 'elasticsearch',
              },
            },
          },
        ],
      },
    };
  }
  return {
    wildcard: {
      filename: {
        value: `*${productName}*`,
        case_insensitive: false,
      },
    },
  };
};
export const extractDocumentation = async ({
  client,
  index,
  stackVersion,
  productName: productNameParam,
  log,
}: {
  client: ElasticsearchClient8;
  index: string;
  stackVersion: string;
  productName: ProductName;
  log: ToolingLog;
}) => {
  log.info(`Starting to extract documents from source cluster`);

  const productName = productNameParam.toLowerCase();
  const query = {
    index,
    size: 10000,
    query: {
      bool: {
        must: [
          {
            bool: {
              should: [generateSearchCriteriaForProduct(productName)],
            },
          },
          {
            exists: {
              field: 'ai_fields.ai_summary',
            },
          },
        ],
      },
    },
    fields,
  };
  console.log(`--@@Query\n`, JSON.stringify(query, null, 2));

  const response = await client.search(query);

  // @TODO: remove
  const totalHits =
    typeof response.hits.total === 'number'
      ? response.hits.total // This format is to be removed in 8.0
      : response.hits.total?.value ?? response.hits.hits.length;

  if (totalHits > 10_000) {
    throw new Error('Found more than 10k documents to extract - aborting');
  }

  log.info(
    `Finished extracting documents from source. ${response.hits.hits.length} documents were extracted`
  );

  return response.hits.hits.map((hit) => convertHit(hit, productName));
};
