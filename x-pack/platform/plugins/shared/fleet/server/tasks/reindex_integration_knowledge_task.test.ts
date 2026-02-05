/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../services';
import { getInstallations, getPackageKnowledgeBase } from '../services/epm/packages';
import { indexKnowledgeBase } from '../services/epm/packages/install_state_machine/steps';

import { reindexIntegrationKnowledgeForInstalledPackages } from './reindex_integration_knowledge_task';

jest.mock('../services');
jest.mock('../services/epm/packages');
jest.mock('../services/epm/registry', () => ({
  getPackage: jest.fn().mockResolvedValue({
    archiveIterator: {},
  }),
}));
jest.mock('../services/epm/packages/install_state_machine/steps', () => ({
  indexKnowledgeBase: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../services/epm/packages/bundled_packages', () => ({
  getBundledPackageForInstallation: jest.fn().mockResolvedValue({
    getBuffer: jest.fn().mockResolvedValue(Buffer.from('')),
  }),
}));
jest.mock('../services/epm/archive', () => ({
  unpackBufferToAssetsMap: jest.fn().mockResolvedValue({
    archiveIterator: {},
  }),
}));

describe('ReindexIntegrationKnowledgeTask', () => {
  const abortController = new AbortController();
  beforeEach(() => {
    (appContextService.getLogger as jest.Mock).mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not reindex knowledge base if already indexed for package version', async () => {
    (getInstallations as jest.Mock).mockResolvedValue({
      saved_objects: [
        {
          attributes: {
            name: 'test-package',
            version: '1.0.0',
            install_source: 'registry',
          },
        },
      ],
    });
    (getPackageKnowledgeBase as jest.Mock).mockResolvedValue({
      items: [{ version: '1.0.0' }],
    });

    await reindexIntegrationKnowledgeForInstalledPackages(abortController);

    expect(indexKnowledgeBase).not.toHaveBeenCalled();
  });

  it('should reindex knowledge base if not indexed for package version', async () => {
    (getInstallations as jest.Mock).mockResolvedValue({
      saved_objects: [
        {
          attributes: {
            name: 'test-package',
            version: '1.0.0',
            install_source: 'registry',
          },
        },
        {
          attributes: {
            name: 'test-bundled',
            version: '2.0.0',
            install_source: 'bundled',
          },
        },
        {
          attributes: {
            name: 'test-upload',
            version: '1.0.0',
            install_source: 'upload',
          },
        },
        {
          attributes: {
            name: 'test-custom',
            version: '1.0.0',
            install_source: 'custom',
          },
        },
      ],
    });
    (getPackageKnowledgeBase as jest.Mock).mockResolvedValue({
      items: [{ version: '0.0.1' }],
    });

    await reindexIntegrationKnowledgeForInstalledPackages(abortController);

    expect(indexKnowledgeBase).toHaveBeenCalledTimes(2);
    expect(indexKnowledgeBase).toHaveBeenCalledWith(
      undefined,
      undefined,
      undefined,
      expect.anything(),
      { name: 'test-package', version: '1.0.0' },
      expect.anything(),
      expect.anything()
    );
    expect(indexKnowledgeBase).toHaveBeenCalledWith(
      undefined,
      undefined,
      undefined,
      expect.anything(),
      { name: 'test-bundled', version: '2.0.0' },
      expect.anything(),
      expect.anything()
    );
  });
});
