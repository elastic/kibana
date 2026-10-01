/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlagsReader } from '@kbn/dev-cli-runner';
import { ToolingLog } from '@kbn/tooling-log';
import { shouldEnforceTraceExport } from './run_helpers';
import type { TraceExportPreflightDeps } from './trace_export_preflight';
import { parseOtlpExporters, redactUrl, runTraceExportPreflight } from './trace_export_preflight';

const TRACE_ID = 'a'.repeat(32);
const HTTP_EXPORTER = { http: { url: 'http://localhost:4318/v1/traces' } };

const createLog = () => {
  const log = new ToolingLog();
  const warning = jest.spyOn(log, 'warning').mockImplementation(() => undefined);
  jest.spyOn(log, 'info').mockImplementation(() => undefined);
  jest.spyOn(log, 'success').mockImplementation(() => undefined);
  return { log, warning };
};

/** A fake clock that advances by the slept duration, so polling timeouts run instantly. */
const createDeps = (overrides: Partial<TraceExportPreflightDeps> = {}) => {
  let clock = 0;
  const deps: TraceExportPreflightDeps = {
    sendCanarySpan: jest.fn().mockResolvedValue({ traceId: TRACE_ID, failures: [] }),
    countTraceDocs: jest.fn().mockResolvedValue(1),
    sleep: jest.fn(async (ms: number) => {
      clock += ms;
    }),
    now: () => clock,
    ...overrides,
  };
  return deps;
};

const run = (
  env: Record<string, string | undefined>,
  deps: TraceExportPreflightDeps,
  enforce = true
) => {
  const { log, warning } = createLog();
  const promise = runTraceExportPreflight({
    env,
    enforce,
    log,
    deps,
    timeoutMs: 10_000,
    pollIntervalMs: 1_000,
  });
  return { promise, warning };
};

describe('parseOtlpExporters', () => {
  it('returns OTLP exporters and ignores Phoenix and Langfuse', () => {
    expect(
      parseOtlpExporters(
        JSON.stringify([
          { http: { url: 'https://ingest.example/v1/traces', headers: { Authorization: 'k' } } },
          { grpc: { url: 'http://localhost:4317' } },
          { phoenix: { base_url: 'http://localhost:6006' } },
          { langfuse: { base_url: 'http://localhost:3000' } },
        ])
      )
    ).toEqual([
      {
        protocol: 'http',
        url: 'https://ingest.example/v1/traces',
        headers: { Authorization: 'k' },
      },
      { protocol: 'grpc', url: 'http://localhost:4317' },
    ]);
  });

  it('accepts a single exporter object', () => {
    expect(parseOtlpExporters(JSON.stringify({ proto: { url: 'http://x/v1/traces' } }))).toEqual([
      { protocol: 'proto', url: 'http://x/v1/traces' },
    ]);
  });
});

describe('redactUrl', () => {
  it('strips credentials', () => {
    expect(redactUrl('http://elastic:changeme@localhost:9200')).toBe('http://localhost:9200/');
  });
});

describe('runTraceExportPreflight', () => {
  it('skips the check when TRACING_EXPORTERS is not set', async () => {
    const deps = createDeps();
    await run({}, deps).promise;
    expect(deps.sendCanarySpan).not.toHaveBeenCalled();
  });

  it('skips the check when only non-OTLP exporters are configured', async () => {
    const deps = createDeps();
    await run({ TRACING_EXPORTERS: JSON.stringify([{ phoenix: { base_url: 'x' } }]) }, deps)
      .promise;
    expect(deps.sendCanarySpan).not.toHaveBeenCalled();
  });

  it('passes once the test span is found in traces-*', async () => {
    const deps = createDeps({
      countTraceDocs: jest.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(1),
    });
    await run(
      {
        TRACING_EXPORTERS: JSON.stringify([HTTP_EXPORTER]),
        TRACING_ES_URL: 'https://traces.example',
        TRACING_ES_API_KEY: 'read-key',
      },
      deps
    ).promise;
    expect(deps.countTraceDocs).toHaveBeenCalledTimes(2);
    expect(deps.countTraceDocs).toHaveBeenCalledWith(
      { url: 'https://traces.example', apiKey: 'read-key' },
      TRACE_ID
    );
  });

  it('fails when an exporter rejects the test span, without leaking URL credentials', async () => {
    const deps = createDeps({
      sendCanarySpan: jest.fn().mockResolvedValue({
        traceId: TRACE_ID,
        failures: [
          {
            target: { protocol: 'http', url: 'http://user:secret@localhost:4318/v1/traces' },
            error: 'connect ECONNREFUSED',
          },
        ],
      }),
    });
    const { promise } = run({ TRACING_EXPORTERS: JSON.stringify([HTTP_EXPORTER]) }, deps);
    await expect(promise).rejects.toThrow(
      'Trace exporter rejected a test span (http http://localhost:4318/v1/traces: connect ECONNREFUSED)'
    );
    await expect(promise).rejects.toThrow('--allow-missing-traces');
    await expect(promise).rejects.not.toThrow('secret');
    expect(deps.countTraceDocs).not.toHaveBeenCalled();
  });

  it('fails when the test span never reaches traces-*', async () => {
    const deps = createDeps({ countTraceDocs: jest.fn().mockResolvedValue(0) });
    await expect(
      run(
        {
          TRACING_EXPORTERS: JSON.stringify([HTTP_EXPORTER]),
          TRACING_ES_URL: 'http://elastic:changeme@localhost:9200',
        },
        deps
      ).promise
    ).rejects.toThrow(
      `A test span (trace ${TRACE_ID}) was accepted by http http://localhost:4318/v1/traces but did not appear in traces-* at http://localhost:9200/ within 10s`
    );
  });

  it('fails with the query error when traces-* cannot be read', async () => {
    const deps = createDeps({
      countTraceDocs: jest.fn().mockRejectedValue(new Error('HTTP 401 security_exception')),
    });
    await expect(
      run(
        {
          TRACING_EXPORTERS: JSON.stringify([HTTP_EXPORTER]),
          TRACING_ES_URL: 'https://traces.example',
        },
        deps
      ).promise
    ).rejects.toThrow(
      'Could not query traces-* at https://traces.example/ to verify trace delivery: HTTP 401 security_exception'
    );
  });

  it('only warns when not enforced', async () => {
    const deps = createDeps({ countTraceDocs: jest.fn().mockResolvedValue(0) });
    const { promise, warning } = run(
      {
        TRACING_EXPORTERS: JSON.stringify([HTTP_EXPORTER]),
        TRACING_ES_URL: 'https://traces.example',
      },
      deps,
      false
    );
    await expect(promise).resolves.toBeUndefined();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('did not appear in traces-*'));
  });

  it('warns that delivery is unverified when TRACING_ES_URL is not set', async () => {
    const deps = createDeps();
    const { promise, warning } = run({ TRACING_EXPORTERS: JSON.stringify([HTTP_EXPORTER]) }, deps);
    await expect(promise).resolves.toBeUndefined();
    expect(deps.countTraceDocs).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('cannot be verified'));
  });
});

describe('shouldEnforceTraceExport', () => {
  // The CLI runner always passes declared boolean flags, defaulting to false.
  const flags = (values: Record<string, string | boolean>) =>
    new FlagsReader({ 'allow-missing-traces': false, ...values });

  it('enforces when an export profile was chosen explicitly', () => {
    expect(shouldEnforceTraceExport(flags({ profile: 'local' }), 'local')).toBe(true);
  });

  it('only warns for an auto-selected local export profile', () => {
    expect(shouldEnforceTraceExport(flags({}), 'local')).toBe(false);
  });

  it('only warns with --allow-missing-traces', () => {
    expect(
      shouldEnforceTraceExport(
        flags({ profile: 'dev-vault', 'allow-missing-traces': true }),
        'dev-vault'
      )
    ).toBe(false);
  });
});
