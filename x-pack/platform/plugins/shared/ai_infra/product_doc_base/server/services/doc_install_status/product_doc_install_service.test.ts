/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResult } from '@kbn/core/server';
import { DocumentationProduct } from '@kbn/product-doc-common';
import type { ProductDocInstallStatusAttributes as TypeAttributes } from '../../saved_objects';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { ProductDocInstallClient } from './product_doc_install_service';

const createObj = (attrs: TypeAttributes): SavedObjectsFindResult<TypeAttributes> => {
  return {
    id: attrs.product_name,
    type: 'type',
    references: [],
    attributes: attrs,
    score: 42,
  };
};

describe('ProductDocInstallClient', () => {
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  let service: ProductDocInstallClient;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    service = new ProductDocInstallClient({ soClient });
  });

  describe('getInstallationStatus', () => {
    it('returns the installation status based on existing entries', async () => {
      soClient.find.mockResolvedValue({
        saved_objects: [
          createObj({
            product_name: 'kibana',
            product_version: '8.15',
            installation_status: 'installed',
          }),
          createObj({
            product_name: 'elasticsearch',
            product_version: '8.15',
            installation_status: 'installing',
          }),
        ],
        total: 2,
        per_page: 100,
        page: 1,
      });

      const installStatus = await service.getInstallationStatus();

      expect(Object.keys(installStatus).sort()).toEqual(Object.keys(DocumentationProduct).sort());
      expect(installStatus.kibana).toEqual({
        status: 'installed',
        version: '8.15',
      });
      expect(installStatus.security).toEqual({
        status: 'uninstalled',
      });
    });
  });
});
