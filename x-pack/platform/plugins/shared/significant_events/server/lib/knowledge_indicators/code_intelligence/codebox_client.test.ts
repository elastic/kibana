/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { CodeboxClient, type ConnectorExecutor } from './codebox_client';

describe('CodeboxClient', () => {
  it('returns large count-only grep results without requesting line payloads', async () => {
    const execute = jest.fn().mockResolvedValue({
      status: 'ok',
      data: { status: 200, data: { count: 1_234_567 } },
    });
    const client = new CodeboxClient({
      executor: { execute } as ConnectorExecutor,
      logger: loggerMock.create(),
    });

    await expect(
      client.grepCount({ org: 'elastic', repo: 'kibana', ref: 'abc123', pattern: '.' })
    ).resolves.toBe(1_234_567);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ path: expect.stringContaining('countOnly=true') }),
      })
    );
  });

  it.each([{ count: -1 }, { count: 1.5 }, { count: '2' }, {}, null])(
    'rejects invalid count-only grep response %#',
    async (data) => {
      const execute = jest.fn().mockResolvedValue({ status: 'ok', data: { status: 200, data } });
      const client = new CodeboxClient({
        executor: { execute } as ConnectorExecutor,
        logger: loggerMock.create(),
      });

      await expect(
        client.grepCount({ org: 'elastic', repo: 'kibana', pattern: 'error' })
      ).rejects.toThrow('invalid grep count');
    }
  );

  it('caps normal grep and rejects match-all patterns', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'ok', data: { status: 200, data: '' } });
    const client = new CodeboxClient({
      executor: { execute } as ConnectorExecutor,
      logger: loggerMock.create(),
    });

    await expect(
      client.grep({ org: 'elastic', repo: 'kibana', pattern: '.', maxCount: 1_000_000 })
    ).rejects.toThrow('rejects match-all patterns');
    await client.grep({ org: 'elastic', repo: 'kibana', pattern: 'error', maxCount: 1_000_000 });
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ path: expect.stringContaining('maxCount=50000') }),
      })
    );
  });

  it('pages recursive path listings to keep connector responses bounded', async () => {
    const firstPage = Array.from({ length: 2000 }, (_, index) => `src/file-${index}.ts`);
    const secondPage = ['src/final.ts'];
    const execute = jest
      .fn()
      .mockResolvedValueOnce({ status: 'ok', data: { status: 200, data: firstPage } })
      .mockResolvedValueOnce({ status: 'ok', data: { status: 200, data: secondPage } });
    const client = new CodeboxClient({
      executor: { execute } as ConnectorExecutor,
      logger: loggerMock.create(),
    });

    const paths = await client.tree({
      org: 'elastic',
      repo: 'kibana',
      ref: 'abc123',
      recursive: true,
      nameOnly: true,
    });

    expect(paths).toEqual([...firstPage, ...secondPage]);
    expect(execute).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        params: expect.objectContaining({
          path: expect.stringContaining('offset=0&limit=2000'),
        }),
      })
    );
    expect(execute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        params: expect.objectContaining({
          path: expect.stringContaining('offset=2000&limit=2000'),
        }),
      })
    );
  });

  it('fails instead of looping when the server ignores pagination', async () => {
    const repeatedPage = Array.from({ length: 2000 }, (_, index) => `src/file-${index}.ts`);
    const execute = jest.fn().mockResolvedValue({
      status: 'ok',
      data: { status: 200, data: repeatedPage },
    });
    const client = new CodeboxClient({
      executor: { execute } as ConnectorExecutor,
      logger: loggerMock.create(),
    });

    await expect(
      client.tree({
        org: 'elastic',
        repo: 'kibana',
        ref: 'abc123',
        recursive: true,
        nameOnly: true,
      })
    ).rejects.toThrow('tree pagination is not supported');
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
