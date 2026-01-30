/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsFindResult } from '@kbn/core/server';
import { DocumentationProduct, ResourceTypes } from '@kbn/product-doc-common';
import type { ProductDocInstallStatusAttributes as TypeAttributes } from '../../saved_objects';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { ProductDocInstallClient } from './product_doc_install_service';
import { loggingSystemMock } from '@kbn/core/public/mocks';

const inferenceId = '.elser-2-elasticsearch';
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
  let log: Logger;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    log = loggingSystemMock.createLogger();
    service = new ProductDocInstallClient({ soClient, log });
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

      const installStatus = await service.getInstallationStatus({ inferenceId });

      expect(Object.keys(installStatus).sort()).toEqual(Object.keys(DocumentationProduct).sort());
      expect(installStatus.kibana).toEqual({
        status: 'installed',
        version: '8.15',
      });
      expect(installStatus.security).toEqual({
        status: 'uninstalled',
      });
    });

    it('filters out security_labs saved objects so they do not overwrite product docs status', async () => {
      soClient.find.mockResolvedValue({
        saved_objects: [
          // Product docs "security" should win
          createObj({
            product_name: 'security',
            product_version: '9.2',
            installation_status: 'installed',
            resource_type: ResourceTypes.productDoc,
            inference_id: inferenceId,
          }),
          // Security Labs record uses product_name=security too, but must be ignored by product docs status
          createObj({
            product_name: 'security',
            product_version: '2025.12.12',
            installation_status: 'uninstalled',
            resource_type: ResourceTypes.securityLabs,
            inference_id: inferenceId,
          }),
        ],
        total: 2,
        per_page: 100,
        page: 1,
      });

      const installStatus = await service.getInstallationStatus({ inferenceId });

      expect(installStatus.security).toEqual({
        status: 'installed',
        version: '9.2',
      });
    });

    it('treats missing resource_type as product_doc (backwards compatibility)', async () => {
      soClient.find.mockResolvedValue({
        saved_objects: [
          createObj({
            product_name: 'security',
            product_version: '9.2',
            installation_status: 'installed',
            // resource_type omitted
            inference_id: inferenceId,
          }),
        ],
        total: 1,
        per_page: 100,
        page: 1,
      });

      const installStatus = await service.getInstallationStatus({ inferenceId });

      expect(installStatus.security).toEqual({
        status: 'installed',
        version: '9.2',
      });
    });
  });

  describe('status setters', () => {
    it('writes resource_type=product_doc when setting installation started', async () => {
      soClient.update.mockResolvedValueOnce({} as any);

      await service.setInstallationStarted({
        productName: 'kibana',
        productVersion: '9.2',
        inferenceId,
      });

      expect(soClient.update).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('kb-product-doc-kibana'),
        expect.objectContaining({
          product_name: 'kibana',
          product_version: '9.2',
          installation_status: 'installing',
          inference_id: inferenceId,
          resource_type: ResourceTypes.productDoc,
        }),
        expect.objectContaining({
          upsert: expect.objectContaining({
            resource_type: ResourceTypes.productDoc,
          }),
        })
      );
    });

    it('writes resource_type=product_doc when setting uninstalled', async () => {
      soClient.update.mockResolvedValueOnce({} as any);

      await service.setUninstalled('kibana', inferenceId);

      expect(soClient.update).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('kb-product-doc-kibana'),
        expect.objectContaining({
          installation_status: 'uninstalled',
          inference_id: inferenceId,
          resource_type: ResourceTypes.productDoc,
        })
      );
    });
  });
});
