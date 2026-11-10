/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ComponentCatalogue } from '@kbn/streams-schema';
import { StatusError } from '../streams/errors/status_error';
import { createComponentCatalogueService } from './component_catalogue_service';

const validateComponent = jest.fn();

const catalogue = (revision: string): ComponentCatalogue => ({
  schema_version: 'v1',
  component_revision: revision,
  components: [],
  metadata: { schema_version: 'v1', enum_sets: {}, path_sets: {} },
  definitions: [],
});

/** A clock the tests move by hand; `freshForMs: 0` makes every call revalidate. */
const clock = (start = 0) => {
  let time = start;
  return { now: () => time, advance: (ms: number) => (time += ms) };
};

describe('createComponentCatalogueService', () => {
  it('fetches the catalogue, then revalidates it with the ETag it holds', async () => {
    const first = catalogue('sha256:first');
    const fetchComponentCatalogue = jest
      .fn()
      .mockResolvedValueOnce({ notModified: false, catalogue: first, etag: '"etag-1"' })
      .mockResolvedValueOnce({ notModified: true });
    const service = createComponentCatalogueService({
      fetchComponentCatalogue,
      validateComponent,
      logger: loggerMock.create(),
      freshForMs: 0,
    });

    await expect(service.get()).resolves.toEqual({
      catalogue: first,
      etag: '"etag-1"',
      stale: false,
    });
    await expect(service.get()).resolves.toEqual({
      catalogue: first,
      etag: '"etag-1"',
      stale: false,
    });

    expect(fetchComponentCatalogue.mock.calls).toEqual([
      [{ etag: undefined }],
      [{ etag: '"etag-1"' }],
    ]);
  });

  it('serves a revalidated catalogue from memory until its freshness window passes', async () => {
    const { now, advance } = clock();
    const fetchComponentCatalogue = jest
      .fn()
      .mockResolvedValueOnce({
        notModified: false,
        catalogue: catalogue('sha256:first'),
        etag: '"etag-1"',
      })
      .mockResolvedValue({ notModified: true });
    const service = createComponentCatalogueService({
      fetchComponentCatalogue,
      validateComponent,
      logger: loggerMock.create(),
      freshForMs: 60_000,
      now,
    });

    await service.get();
    advance(59_999);
    await service.get();
    expect(fetchComponentCatalogue).toHaveBeenCalledTimes(1);

    advance(1);
    await service.get();
    expect(fetchComponentCatalogue).toHaveBeenCalledTimes(2);
  });

  it('replaces the cached catalogue when the distributor serves a new one', async () => {
    const second = catalogue('sha256:second');
    const fetchComponentCatalogue = jest
      .fn()
      .mockResolvedValueOnce({
        notModified: false,
        catalogue: catalogue('sha256:first'),
        etag: '"etag-1"',
      })
      .mockResolvedValueOnce({ notModified: false, catalogue: second, etag: '"etag-2"' });
    const service = createComponentCatalogueService({
      fetchComponentCatalogue,
      validateComponent,
      logger: loggerMock.create(),
      freshForMs: 0,
    });

    await service.get();

    await expect(service.get()).resolves.toEqual({
      catalogue: second,
      etag: '"etag-2"',
      stale: false,
    });
  });

  it('warns once per unsupported schema version the distributor moves to', async () => {
    const v2 = { ...catalogue('sha256:v2'), schema_version: 'v2' };
    const fetchComponentCatalogue = jest
      .fn()
      .mockResolvedValueOnce({ notModified: false, catalogue: v2, etag: '"etag-1"' })
      .mockResolvedValueOnce({ notModified: true })
      .mockResolvedValueOnce({ notModified: false, catalogue: v2, etag: '"etag-2"' })
      .mockResolvedValueOnce({ notModified: false, catalogue: catalogue('sha256:v1') });
    const logger = loggerMock.create();
    const service = createComponentCatalogueService({
      fetchComponentCatalogue,
      validateComponent,
      logger,
      freshForMs: 0,
    });

    await expect(service.get()).resolves.toMatchObject({ catalogue: v2, etag: '"etag-1"' });
    await service.get();
    await service.get();
    await service.get();

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toMatch(
      /schema version v2, which this Kibana does not support \(v1\)/
    );
  });

  it('shares one distributor request between concurrent callers', async () => {
    const fetchComponentCatalogue = jest.fn().mockResolvedValue({
      notModified: false,
      catalogue: catalogue('sha256:first'),
      etag: '"etag-1"',
    });
    const service = createComponentCatalogueService({
      fetchComponentCatalogue,
      validateComponent,
      logger: loggerMock.create(),
      freshForMs: 0,
    });

    const [a, b] = await Promise.all([service.get(), service.get()]);

    expect(a).toBe(b);
    expect(fetchComponentCatalogue).toHaveBeenCalledTimes(1);
  });

  it('serves the cached catalogue as stale while revalidation fails, warning once per outage', async () => {
    const first = catalogue('sha256:first');
    const logger = loggerMock.create();
    const fetchComponentCatalogue = jest
      .fn()
      .mockResolvedValueOnce({ notModified: false, catalogue: first, etag: '"etag-1"' })
      .mockRejectedValueOnce(new StatusError('distributor unreachable', 502))
      .mockRejectedValueOnce(new StatusError('distributor unreachable', 502))
      .mockResolvedValueOnce({ notModified: true });
    const time = clock();
    const service = createComponentCatalogueService({
      fetchComponentCatalogue,
      validateComponent,
      logger,
      freshForMs: 60_000,
      now: time.now,
    });

    await service.get();
    time.advance(60_000);

    await expect(service.get()).resolves.toEqual({
      catalogue: first,
      etag: '"etag-1"',
      stale: true,
    });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('distributor unreachable'));

    // The stale copy is served without asking again until the next window, so an unresponsive
    // distributor does not cost a request timeout per call.
    await expect(service.get()).resolves.toMatchObject({ stale: true });
    expect(fetchComponentCatalogue).toHaveBeenCalledTimes(2);

    time.advance(60_000);
    await expect(service.get()).resolves.toMatchObject({ stale: true });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('distributor unreachable'));

    time.advance(60_000);
    await expect(service.get()).resolves.toMatchObject({ stale: false });
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('succeeded again'));
    expect(fetchComponentCatalogue).toHaveBeenCalledTimes(4);
  });

  it('throws when the first fetch fails, and fetches again on the next call', async () => {
    const first = catalogue('sha256:first');
    const fetchComponentCatalogue = jest
      .fn()
      .mockRejectedValueOnce(new StatusError('not configured', 503))
      .mockResolvedValueOnce({ notModified: false, catalogue: first });
    const service = createComponentCatalogueService({
      fetchComponentCatalogue,
      validateComponent,
      logger: loggerMock.create(),
    });

    await expect(service.get()).rejects.toMatchObject({ statusCode: 503 });
    await expect(service.get()).resolves.toEqual({
      catalogue: first,
      etag: undefined,
      stale: false,
    });
  });
});
