/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getProductDocIndexName,
  getSecurityLabsIndexName,
  ResourceTypes,
} from '@kbn/product-doc-common';
import {
  getIndicesForProductNames,
  getIndicesForResourceTypes,
} from './get_indices_for_product_names';
import { defaultInferenceEndpoints } from '@kbn/inference-common';

describe('getIndicesForProductNames', () => {
  it('returns the index pattern when product names are not specified', () => {
    const allProductNames = [
      getProductDocIndexName('kibana'),
      getProductDocIndexName('elasticsearch'),
      getProductDocIndexName('observability'),
      getProductDocIndexName('security'),
    ];
    expect(getIndicesForProductNames(undefined, undefined)).toEqual(allProductNames);
    expect(getIndicesForProductNames([], undefined)).toEqual(allProductNames);
  });
  it('returns individual index names when product names are specified', () => {
    expect(getIndicesForProductNames(['kibana', 'elasticsearch'])).toEqual([
      getProductDocIndexName('kibana'),
      getProductDocIndexName('elasticsearch'),
    ]);
  });
  it('returns individual index names when ELSER EIS is specified', () => {
    expect(getIndicesForProductNames(['kibana', 'elasticsearch'], '.elser-2-elastic')).toEqual([
      getProductDocIndexName('kibana'),
      getProductDocIndexName('elasticsearch'),
    ]);
  });
  it('returns individual index names when ELSER is specified', () => {
    expect(
      getIndicesForProductNames(['kibana', 'elasticsearch'], defaultInferenceEndpoints.ELSER)
    ).toEqual([getProductDocIndexName('kibana'), getProductDocIndexName('elasticsearch')]);
  });

  it('returns the index pattern when inferenceId is specified', () => {
    expect(
      getIndicesForProductNames(
        ['kibana', 'elasticsearch'],
        defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL
      )
    ).toEqual([
      '.kibana_ai_product_doc_kibana-.multilingual-e5-small-elasticsearch',
      '.kibana_ai_product_doc_elasticsearch-.multilingual-e5-small-elasticsearch',
    ]);
    expect(getIndicesForProductNames(['kibana', 'elasticsearch'], '.anyInferenceId')).toEqual([
      '.kibana_ai_product_doc_kibana-.anyInferenceId',
      '.kibana_ai_product_doc_elasticsearch-.anyInferenceId',
    ]);
  });
});

describe('getIndicesForResourceTypes', () => {
  it('defaults to product documentation indices', () => {
    expect(getIndicesForResourceTypes(['kibana'], undefined, undefined)).toEqual(
      getProductDocIndexName('kibana')
    );
  });

  it('returns security labs index when only security labs is requested', () => {
    expect(getIndicesForResourceTypes(undefined, undefined, [ResourceTypes.securityLabs])).toEqual(
      getSecurityLabsIndexName()
    );
  });

  it('returns both product docs and security labs indices when both are requested', () => {
    expect(
      getIndicesForResourceTypes(['kibana'], undefined, [
        ResourceTypes.productDoc,
        ResourceTypes.securityLabs,
      ])
    ).toEqual([getProductDocIndexName('kibana'), getSecurityLabsIndexName()]);
  });
});
