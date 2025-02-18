/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { ProductDocInstallStatusAttributes } from '../../saved_objects';
import { soToModel } from './model_conversion';

const createObj = (
  attrs: ProductDocInstallStatusAttributes
): SavedObject<ProductDocInstallStatusAttributes> => {
  return {
    id: 'some-id',
    type: 'product-doc-install-status',
    attributes: attrs,
    references: [],
  };
};

describe('soToModel', () => {
  it('converts the SO to the expected shape', () => {
    const input = createObj({
      product_name: 'kibana',
      product_version: '8.16',
      installation_status: 'installed',
      last_installation_date: 9000,
      index_name: '.kibana',
    });

    const output = soToModel(input);

    expect(output).toEqual({
      id: 'some-id',
      productName: 'kibana',
      productVersion: '8.16',
      indexName: '.kibana',
      installationStatus: 'installed',
      lastInstallationDate: expect.any(Date),
    });
  });
});
