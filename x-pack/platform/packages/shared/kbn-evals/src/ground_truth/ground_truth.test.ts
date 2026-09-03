/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import {
  GROUND_TRUTH_DIR_ENV,
  ensureGroundTruthDir,
  readGroundTruthTreeSync,
} from './ground_truth';

// The module authenticates with google-auth-library; tests only verify that the resulting
// bearer token reaches the (fake) fetch.
jest.mock('google-auth-library', () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({
    getAccessToken: async () => 'test-token',
  })),
}));

const SOURCE = { bucket: 'significant-events-datasets', prefix: '2026-03-27/' };
const CREDS_ENV = { GCS_CREDENTIALS: '{"type":"service_account"}' };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/** Fake GCS JSON API. `objects` maps full object name -> text. Lists in two pages. */
const fakeGcs = (objects: Record<string, string>) => {
  const requests: string[] = [];
  const names = Object.keys(objects);
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    requests.push(url.toString());
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
    if (url.pathname.endsWith('/o')) {
      const isSecondPage = url.searchParams.get('pageToken') === 'p2';
      return isSecondPage
        ? json({ items: names.slice(1).map((name) => ({ name })) })
        : json({
            items: names.slice(0, 1).map((name) => ({ name })),
            nextPageToken: names.length > 1 ? 'p2' : undefined,
          });
    }
    const objectName = decodeURIComponent(url.pathname.split('/o/')[1]);
    return objectName in objects
      ? new Response(objects[objectName], { status: 200 })
      : new Response('no such object', { status: 404, statusText: 'Not Found' });
  }) as unknown as typeof fetch;
  return { fetchImpl, requests };
};

describe('ensureGroundTruthDir', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kbn-evals-gt-'));
  });

  afterEach(() => {
    Fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('uses KBN_EVALS_GROUND_TRUTH_DIR when set and never touches the network', async () => {
    const override = Path.join(tmp, 'local');
    Fs.mkdirSync(override);
    const { fetchImpl, requests } = fakeGcs({});
    const log = jest.fn();

    const result = await ensureGroundTruthDir({
      source: SOURCE,
      env: { [GROUND_TRUTH_DIR_ENV]: override },
      fetchImpl,
      log,
    });

    expect(result.dir).toBe(override);
    expect(requests).toEqual([]);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Using local ground truth'));
    await expect(
      ensureGroundTruthDir({
        source: SOURCE,
        env: { [GROUND_TRUTH_DIR_ENV]: Path.join(tmp, 'nope') },
      })
    ).rejects.toThrow(/is not a directory/);
  });

  it('fails fast naming both options when neither credentials nor override are set', async () => {
    await expect(ensureGroundTruthDir({ source: SOURCE, env: {} })).rejects.toThrow(
      new RegExp(`GCS_CREDENTIALS is not set.*${GROUND_TRUTH_DIR_ENV}`)
    );
  });

  it('downloads every json object under the prefix into targetDir (wiping it first) and exports the env var', async () => {
    const targetDir = Path.join(tmp, 'target');
    Fs.mkdirSync(targetDir);
    Fs.writeFileSync(Path.join(targetDir, 'stale.json'), '{}');
    const { fetchImpl, requests } = fakeGcs({
      '2026-03-27/otel-demo/dataset.json': '{"id":"otel-demo"}',
      '2026-03-27/otel-demo/payment-unreachable/ground-truth.json': '{"discovery":[]}',
    });
    const env: NodeJS.ProcessEnv = { ...CREDS_ENV };

    const result = await ensureGroundTruthDir({ source: SOURCE, env, fetchImpl, targetDir });

    expect(result).toEqual({ dir: targetDir, fileCount: 2 });
    expect(env[GROUND_TRUTH_DIR_ENV]).toBe(targetDir);
    expect(Fs.existsSync(Path.join(targetDir, 'stale.json'))).toBe(false);
    expect(Fs.readFileSync(Path.join(targetDir, 'otel-demo/dataset.json'), 'utf8')).toBe(
      '{"id":"otel-demo"}'
    );
    expect(
      Fs.readFileSync(
        Path.join(targetDir, 'otel-demo/payment-unreachable/ground-truth.json'),
        'utf8'
      )
    ).toBe('{"discovery":[]}');
    const listUrl = new URL(requests[0]);
    expect(listUrl.pathname).toBe('/storage/v1/b/significant-events-datasets/o');
    expect(listUrl.searchParams.get('prefix')).toBe('2026-03-27/');
    expect(listUrl.searchParams.get('matchGlob')).toBe('2026-03-27/**/*.json');
    expect(requests.filter((url) => url.includes('/o?')).length).toBe(2);
  });

  it('throws when the prefix has no json objects', async () => {
    await expect(
      ensureGroundTruthDir({
        source: SOURCE,
        env: { ...CREDS_ENV },
        fetchImpl: fakeGcs({}).fetchImpl,
        targetDir: Path.join(tmp, 't'),
      })
    ).rejects.toThrow(
      /No ground-truth files found at gs:\/\/significant-events-datasets\/2026-03-27\//
    );
  });

  it('surfaces non-2xx responses with status and body', async () => {
    const fetchImpl = (async () =>
      new Response('forbidden by policy', {
        status: 403,
        statusText: 'Forbidden',
      })) as unknown as typeof fetch;
    await expect(
      ensureGroundTruthDir({
        source: SOURCE,
        env: { ...CREDS_ENV },
        fetchImpl,
        targetDir: Path.join(tmp, 't'),
      })
    ).rejects.toThrow(/GCS request failed \(403 Forbidden\).*forbidden by policy/);
  });
});

describe('readGroundTruthTreeSync', () => {
  let dir: string;

  beforeEach(() => {
    dir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kbn-evals-gt-read-'));
  });

  afterEach(() => {
    Fs.rmSync(dir, { recursive: true, force: true });
  });

  const write = (relativePath: string, content: string) => {
    const target = Path.join(dir, ...relativePath.split('/'));
    Fs.mkdirSync(Path.dirname(target), { recursive: true });
    Fs.writeFileSync(target, content);
  };

  it('throws a remediation message when the env var is not set', () => {
    expect(() => readGroundTruthTreeSync({ env: {} })).toThrow(
      new RegExp(`${GROUND_TRUTH_DIR_ENV} is not set.*node scripts/evals run`)
    );
  });

  it('reads every .json file recursively, sorted by relative path, ignoring other files', () => {
    write('otel-demo/dataset.json', '{"id":"otel-demo"}');
    write('otel-demo/payment-unreachable/ground-truth.json', '{"discovery":[]}');
    write('otel-demo/payment-unreachable/annotations.jsonl', '{"doc_id":"x"}\n');
    write('bank-of-anthos/dataset.json', '{"id":"bank-of-anthos"}');

    expect(readGroundTruthTreeSync({ env: { [GROUND_TRUTH_DIR_ENV]: dir } })).toEqual([
      { relativePath: 'bank-of-anthos/dataset.json', json: { id: 'bank-of-anthos' } },
      { relativePath: 'otel-demo/dataset.json', json: { id: 'otel-demo' } },
      { relativePath: 'otel-demo/payment-unreachable/ground-truth.json', json: { discovery: [] } },
    ]);
  });

  it('names the offending file when JSON is malformed', () => {
    write('otel-demo/dataset.json', '{ not json');
    expect(() => readGroundTruthTreeSync({ env: { [GROUND_TRUTH_DIR_ENV]: dir } })).toThrow(
      /Failed to parse ground-truth file otel-demo\/dataset\.json/
    );
  });
});
