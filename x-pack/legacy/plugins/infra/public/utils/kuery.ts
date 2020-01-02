/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { esKuery, IIndexPattern } from '../../../../../../src/plugins/data/public';

export const convertKueryToElasticSearchQuery = (
  kueryExpression: string,
  indexPattern: IIndexPattern
) => {
  try {
    return kueryExpression
      ? JSON.stringify(
          esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(kueryExpression), indexPattern)
        )
      : '';
  } catch (err) {
    return '';
  }
};
