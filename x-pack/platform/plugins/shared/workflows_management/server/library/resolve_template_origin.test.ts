/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { Template } from '@kbn/workflows-library';

import { LibraryFetchError } from './errors';
import { CATALOG_LOOKUP_TIMEOUT_MS, resolveTemplateOrigin } from './resolve_template_origin';

const catalogRow: Template = {
  slug: 'triage-alerts',
  version: '1.2.0',
  availability: '>=9.5.0',
  name: 'Triage alerts',
  description: 'Triages alerts',
  categories: ['utility'],
  definitionUrl: 'templates/triage-alerts/1.2.0.yaml',
  contentHash: `sha256:${'0'.repeat(64)}`,
  stepTypes: [],
  triggerTypes: [],
};

const buildLibraryService = (templates: Template[]) => ({
  listTemplates: jest.fn().mockResolvedValue(templates),
  getCachedTemplates: jest.fn().mockReturnValue(templates),
});

describe('resolveTemplateOrigin', () => {
  it('keeps the slug and version of a catalog template', async () => {
    await expect(
      resolveTemplateOrigin({
        libraryService: buildLibraryService([catalogRow]),
        logger: loggerMock.create(),
        slug: 'triage-alerts',
        version: '1.2.0',
        origin: 'import',
      })
    ).resolves.toEqual({
      templateSlug: 'triage-alerts',
      templateVersion: '1.2.0',
      templateOrigin: 'import',
    });
  });

  it.each([
    ['an older version', '1.1.0'],
    ['a prerelease or build with free text', '1.2.0-acme-corp-secret+customer.xyz'],
    ['a version that is not semver', 'latest'],
    ['no version', undefined],
  ])('keeps the slug but drops %s, which the catalog does not confirm', async (_, version) => {
    await expect(
      resolveTemplateOrigin({
        libraryService: buildLibraryService([catalogRow]),
        logger: loggerMock.create(),
        slug: 'triage-alerts',
        version,
        origin: 'remix',
      })
    ).resolves.toEqual({ templateSlug: 'triage-alerts', templateOrigin: 'remix' });
  });

  it('stores a template outside the catalog as custom, without a version', async () => {
    await expect(
      resolveTemplateOrigin({
        libraryService: buildLibraryService([catalogRow]),
        logger: loggerMock.create(),
        slug: 'acme-internal-escalation',
        version: '1.0.0',
        origin: 'import',
      })
    ).resolves.toEqual({ templateSlug: 'custom', templateOrigin: 'import' });
  });

  it('stores the template as unresolved when no catalog can be read', async () => {
    const logger = loggerMock.create();
    const libraryService = {
      listTemplates: jest
        .fn()
        .mockRejectedValue(new LibraryFetchError('upstream down', 'unavailable', 'cdn')),
      getCachedTemplates: jest.fn().mockReturnValue(undefined),
    };

    await expect(
      resolveTemplateOrigin({
        libraryService,
        logger,
        slug: 'triage-alerts',
        version: '1.2.0',
        origin: 'remix',
      })
    ).resolves.toEqual({ templateSlug: 'unresolved', templateOrigin: 'remix' });
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('upstream down'));
  });

  describe('when the catalog is slow', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const resolveWithStalledRefresh = async (cachedTemplates: Template[] | undefined) => {
      const logger = loggerMock.create();
      const libraryService = {
        listTemplates: jest.fn(() => new Promise<Template[]>(() => {})),
        getCachedTemplates: jest.fn().mockReturnValue(cachedTemplates),
      };

      const resolved = resolveTemplateOrigin({
        libraryService,
        logger,
        slug: 'triage-alerts',
        version: '1.2.0',
        origin: 'remix',
      });
      await jest.advanceTimersByTimeAsync(CATALOG_LOOKUP_TIMEOUT_MS);

      return { resolved: await resolved, logger };
    };

    it('falls back to the last cached catalog once the lookup deadline passes', async () => {
      const { resolved, logger } = await resolveWithStalledRefresh([catalogRow]);

      expect(resolved).toEqual({
        templateSlug: 'triage-alerts',
        templateVersion: '1.2.0',
        templateOrigin: 'remix',
      });
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('timed out'));
    });

    it('stores the template as unresolved when there is no cached catalog either', async () => {
      const { resolved } = await resolveWithStalledRefresh(undefined);

      expect(resolved).toEqual({ templateSlug: 'unresolved', templateOrigin: 'remix' });
    });
  });
});
