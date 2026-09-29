/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { appContextService } from '../services';
import { getInstallations, getPackageKnowledgeBase } from '../services/epm/packages';
import { indexKnowledgeBase } from '../services/epm/packages/install_state_machine/steps';

import { reindexIntegrationKnowledgeForInstalledPackages } from './reindex_integration_knowledge_task';

vi.mock('../services');
vi.mock('../services/epm/packages');
vi.mock('../services/epm/registry', () => {
  const mocked = {
    getPackage: vi.fn().mockResolvedValue({
      archiveIterator: {},
    }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../services/epm/packages/install_state_machine/steps', () => {
  const mocked = {
    indexKnowledgeBase: vi.fn().mockResolvedValue(undefined),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../services/epm/packages/bundled_packages', () => {
  const mocked = {
    getBundledPackageForInstallation: vi.fn().mockResolvedValue({
      getBuffer: vi.fn().mockResolvedValue(Buffer.from('')),
    }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../services/epm/archive', () => {
  const mocked = {
    unpackBufferToAssetsMap: vi.fn().mockResolvedValue({
      archiveIterator: {},
    }),
  };
  return { ...mocked, default: mocked };
});

describe('ReindexIntegrationKnowledgeTask', () => {
  const { signal } = new AbortController();
  beforeEach(() => {
    (appContextService.getLogger as Mock).mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not reindex knowledge base if already indexed for package version', async () => {
    (getInstallations as Mock).mockResolvedValue({
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
    (getPackageKnowledgeBase as Mock).mockResolvedValue({
      items: [{ version: '1.0.0' }],
    });

    await reindexIntegrationKnowledgeForInstalledPackages(signal);

    expect(indexKnowledgeBase).not.toHaveBeenCalled();
  });

  it('should reindex knowledge base if not indexed for package version', async () => {
    (getInstallations as Mock).mockResolvedValue({
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
    (getPackageKnowledgeBase as Mock).mockResolvedValue({
      items: [{ version: '0.0.1' }],
    });

    await reindexIntegrationKnowledgeForInstalledPackages(signal);

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
