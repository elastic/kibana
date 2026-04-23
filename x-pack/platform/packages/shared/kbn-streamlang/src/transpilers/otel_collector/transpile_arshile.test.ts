/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * End-to-end integration tests for the OTel Collector transpiler. Each test:
 *   1. Transpiles a Streamlang DSL to YAML via `transpile()`.
 *   2. Writes a temp arshile project (collector.yaml + OTLP payload).
 *   3. Runs `arshile run` to replay the payload through a live otelcol binary.
 *   4. Parses outputs/logs.json and asserts the transformed attributes.
 *
 * These tests require `arshile` on $PATH and a collector binary reachable by
 * arshile (either via arshile.yaml or the default download path).
 * Install: go install github.com/andrewvc/arshile@latest && arshile download-collector
 *
 * The entire suite is skipped automatically when arshile is not present.
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { StreamlangDSL } from '../../../types/streamlang';
import { transpile } from '.';

// ---------------------------------------------------------------------------
// Availability check — skip the entire suite if arshile or the otelcol
// binary is unavailable. The binary-not-found error is immediate (< 1 s)
// so the probe adds negligible overhead.
// ---------------------------------------------------------------------------

const PROBE_YAML = [
  'receivers:',
  '  otlp:',
  '    protocols:',
  '      grpc: {}',
  'exporters:',
  '  debug: {}',
  'processors: {}',
  'service:',
  '  pipelines:',
  '    logs:',
  '      receivers: [otlp]',
  '      exporters: [debug]',
  '      processors: []',
].join('\n');

const PROBE_PAYLOAD = JSON.stringify({
  resourceLogs: [
    {
      resource: { attributes: [] },
      scopeLogs: [{ logRecords: [{ body: { stringValue: 'probe' }, attributes: [] }] }],
    },
  ],
});

/**
 * Discover the otelcol binary path. Checks (in order):
 *   1. OTELCOL_BINARY env var — suitable for CI: export OTELCOL_BINARY=/path/to/otelcol
 *   2. `otelcol` on $PATH — users who installed globally
 *   3. `otelcol-contrib` on $PATH — alternate binary name
 */
const findOtelcolBinary = (): string | null => {
  const envOverride = process.env.OTELCOL_BINARY;
  if (envOverride && fs.existsSync(envOverride)) return envOverride;

  for (const name of ['otelcol', 'otelcol-contrib']) {
    const r = spawnSync('which', [name], { encoding: 'utf8' });
    if (r.status === 0) return r.stdout.trim();
  }

  // Well-known local development build path for the OTel Collector contrib repo.
  const homeDir = os.homedir();
  const localBuilds = [
    path.join(homeDir, 'projects', 'opentelemetry-collector-contrib', 'bin', 'otelcontribcol_darwin_arm64'),
    path.join(homeDir, 'projects', 'opentelemetry-collector-contrib', 'bin', 'otelcontribcol'),
    path.join(homeDir, 'go', 'bin', 'otelcontribcol'),
  ];
  for (const p of localBuilds) {
    if (fs.existsSync(p)) return p;
  }

  return null;
};

/** Returns true if arshile and a usable otelcol binary are both available. */
const probeArshile = (): { available: boolean; binaryPath: string | null } => {
  const which = spawnSync('which', ['arshile'], { encoding: 'utf8' });
  if (which.status !== 0) return { available: false, binaryPath: null };

  const binaryPath = findOtelcolBinary();
  if (!binaryPath) return { available: false, binaryPath: null };

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arshile-probe-'));
  try {
    fs.writeFileSync(path.join(tmpDir, 'collector.yaml'), PROBE_YAML);
    fs.mkdirSync(path.join(tmpDir, 'payloads'));
    fs.writeFileSync(path.join(tmpDir, 'payloads', 'probe.json'), PROBE_PAYLOAD);
    const result = spawnSync('arshile', ['run', '--collector-binary', binaryPath], {
      cwd: tmpDir,
      encoding: 'utf8',
      timeout: 15_000,
    });
    return { available: result.status === 0, binaryPath };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
};

const { available: arshileAvailable, binaryPath: otelcolBinary } = probeArshile();
const describeIfArshile = arshileAvailable ? describe : describe.skip;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wrap the transpiler's `processors:` + `service:` YAML fragment into a
 * complete collector.yaml that arshile can run. The service.pipelines.logs
 * block in the transpiled output only lists `processors:`; we add the
 * `receivers:` and `exporters:` entries required for a valid config.
 */
const buildCollectorYaml = (transpilerYaml: string): string => {
  const header = [
    'receivers:',
    '  otlp:',
    '    protocols:',
    '      grpc: {}',
    '',
    'exporters:',
    '  debug: {}',
    '',
  ].join('\n');

  // Inject receivers/exporters into the service.pipelines.logs block.
  const augmented = transpilerYaml.replace(
    /(    logs:\n)(      processors:)/,
    '$1      receivers: [otlp]\n      exporters: [debug]\n$2'
  );

  return header + augmented;
};

/** Minimal OTLP JSON log payload with the given attributes. */
const makePayload = (attrs: Record<string, unknown>, bodyText = 'test log'): string =>
  JSON.stringify({
    resourceLogs: [
      {
        resource: { attributes: [{ key: 'service.name', value: { stringValue: 'sl-test' } }] },
        scopeLogs: [
          {
            logRecords: [
              {
                timeUnixNano: '1686252554792945000',
                severityText: 'INFO',
                body: { stringValue: bodyText },
                attributes: Object.entries(attrs).map(([key, val]) => ({
                  key,
                  value: ottlpValue(val),
                })),
              },
            ],
          },
        ],
      },
    ],
  });

const ottlpValue = (val: unknown): Record<string, unknown> => {
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number' && Number.isInteger(val)) return { intValue: String(val) };
  if (typeof val === 'number') return { doubleValue: val };
  if (typeof val === 'boolean') return { boolValue: val };
  return { stringValue: String(val) };
};

interface AttrRecord {
  attrs: Record<string, unknown>;
  bodyText?: string;
}

const extractAttrValue = (v: Record<string, unknown>): unknown => {
  if ('stringValue' in v) return v.stringValue;
  if ('intValue' in v) return Number(v.intValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('boolValue' in v) return v.boolValue;
  if ('arrayValue' in v) {
    const arr = v.arrayValue as { values?: Array<Record<string, unknown>> };
    return (arr.values ?? []).map(extractAttrValue);
  }
  return null;
};

const parseArshileOutput = (outputPath: string): AttrRecord[] => {
  if (!fs.existsSync(outputPath)) return [];
  const content = fs.readFileSync(outputPath, 'utf8').trim();
  if (!content) return [];

  const records: AttrRecord[] = [];
  for (const line of content.split('\n').filter(Boolean)) {
    const batch = JSON.parse(line) as {
      resourceLogs?: Array<{
        scopeLogs?: Array<{
          logRecords?: Array<{
            body?: { stringValue?: string };
            attributes?: Array<{ key: string; value: Record<string, unknown> }>;
          }>;
        }>;
      }>;
    };
    for (const rl of batch.resourceLogs ?? []) {
      for (const sl of rl.scopeLogs ?? []) {
        for (const lr of sl.logRecords ?? []) {
          const attrs: Record<string, unknown> = {};
          for (const a of lr.attributes ?? []) {
            attrs[a.key] = extractAttrValue(a.value);
          }
          records.push({ attrs, bodyText: lr.body?.stringValue });
        }
      }
    }
  }
  return records;
};

/**
 * Transpile `dsl`, write a temp arshile project, run it, and return the
 * parsed output log records.
 */
const runArshileTest = async (
  dsl: StreamlangDSL,
  inputAttrs: Record<string, unknown>,
  bodyText = 'test log'
): Promise<AttrRecord[]> => {
  const result = await transpile(dsl);
  const collectorYaml = buildCollectorYaml(result.yaml);
  const payload = makePayload(inputAttrs, bodyText);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'streamlang-arshile-'));
  try {
    fs.writeFileSync(path.join(tmpDir, 'collector.yaml'), collectorYaml);
    fs.mkdirSync(path.join(tmpDir, 'payloads'));
    fs.writeFileSync(path.join(tmpDir, 'payloads', 'test.json'), payload);

    const arshileArgs = ['run'];
    if (otelcolBinary) arshileArgs.push('--collector-binary', otelcolBinary);
    const run = spawnSync('arshile', arshileArgs, {
      cwd: tmpDir,
      encoding: 'utf8',
      timeout: 30_000,
    });

    if (run.error) throw run.error;
    if (run.status !== 0) {
      throw new Error(
        `arshile run exited ${run.status}\nstdout: ${run.stdout}\nstderr: ${run.stderr}`
      );
    }

    return parseArshileOutput(path.join(tmpDir, 'outputs', 'logs.json'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describeIfArshile('OTel transpiler — arshile live integration', () => {
  it('set: writes a literal string attribute', async () => {
    const dsl: StreamlangDSL = {
      steps: [{ action: 'set', to: 'status', value: 'ok' }],
    };
    const records = await runArshileTest(dsl, {});
    expect(records).toHaveLength(1);
    expect(records[0].attrs['status']).toBe('ok');
  });

  it('set: copies a field value (copy_from)', async () => {
    const dsl: StreamlangDSL = {
      steps: [{ action: 'set', to: 'host.copy', copy_from: 'hostname' }],
    };
    const records = await runArshileTest(dsl, { hostname: 'web-01' });
    expect(records[0].attrs['host.copy']).toBe('web-01');
  });

  it('remove: deletes an existing field', async () => {
    const dsl: StreamlangDSL = {
      steps: [{ action: 'remove', from: 'secret' }],
    };
    const records = await runArshileTest(dsl, { secret: 'abc123', keep: 'yes' });
    expect(records[0].attrs['secret']).toBeUndefined();
    expect(records[0].attrs['keep']).toBe('yes');
  });

  it('uppercase: uppercases a string field', async () => {
    const dsl: StreamlangDSL = {
      steps: [{ action: 'uppercase', from: 'level' }],
    };
    const records = await runArshileTest(dsl, { level: 'warn' });
    expect(records[0].attrs['level']).toBe('WARN');
  });

  it('lowercase: lowercases a string field', async () => {
    const dsl: StreamlangDSL = {
      steps: [{ action: 'lowercase', from: 'level' }],
    };
    const records = await runArshileTest(dsl, { level: 'ERROR' });
    expect(records[0].attrs['level']).toBe('error');
  });

  it('trim: trims whitespace from a string field', async () => {
    const dsl: StreamlangDSL = {
      steps: [{ action: 'trim', from: 'name' }],
    };
    const records = await runArshileTest(dsl, { name: '  alice  ' });
    expect(records[0].attrs['name']).toBe('alice');
  });

  it('rename: moves a field to a new name', async () => {
    const dsl: StreamlangDSL = {
      steps: [{ action: 'rename', from: 'old_name', to: 'new_name' }],
    };
    const records = await runArshileTest(dsl, { old_name: 'value' });
    expect(records[0].attrs['new_name']).toBe('value');
    expect(records[0].attrs['old_name']).toBeUndefined();
  });

  it('split: splits a string field into an array', async () => {
    const dsl: StreamlangDSL = {
      steps: [{ action: 'split', from: 'tags', separator: ',' }],
    };
    const records = await runArshileTest(dsl, { tags: 'a,b,c' });
    expect(records[0].attrs['tags']).toEqual(['a', 'b', 'c']);
  });

  it('convert: converts a string to an integer', async () => {
    const dsl: StreamlangDSL = {
      steps: [{ action: 'convert', from: 'port', type: 'integer' }],
    };
    const records = await runArshileTest(dsl, { port: '8080' });
    expect(records[0].attrs['port']).toBe(8080);
  });

  it('replace: replaces regex matches in a string field in-place', async () => {
    const dsl: StreamlangDSL = {
      steps: [{ action: 'replace', from: 'email', pattern: '@.*', replacement: '@redacted' }],
    };
    const records = await runArshileTest(dsl, { email: 'user@example.com' });
    expect(records[0].attrs['email']).toBe('user@redacted');
  });

  it('grok: extracts fields from a structured log line', async () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          action: 'grok',
          from: 'message',
          patterns: ['%{IP:client_ip} %{NUMBER:bytes}'],
        },
      ],
    };
    const records = await runArshileTest(dsl, { message: '1.2.3.4 512' });
    expect(records[0].attrs['client_ip']).toBe('1.2.3.4');
    expect(records[0].attrs['bytes']).toBe('512');
  });

  it('concat: concatenates fields and literals', async () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          action: 'concat',
          from: [
            { type: 'field', value: 'first' },
            { type: 'literal', value: ' ' },
            { type: 'field', value: 'last' },
          ],
          to: 'full_name',
        },
      ],
    };
    const records = await runArshileTest(dsl, { first: 'John', last: 'Doe' });
    expect(records[0].attrs['full_name']).toBe('John Doe');
  });

  it('join: joins an array of fields with a delimiter', async () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          action: 'join',
          from: ['host', 'port'],
          delimiter: ':',
          to: 'endpoint',
        },
      ],
    };
    const records = await runArshileTest(dsl, { host: 'localhost', port: '9200' });
    expect(records[0].attrs['endpoint']).toBe('localhost:9200');
  });

  it('append: appends a value to an array (creates if absent)', async () => {
    const dsl: StreamlangDSL = {
      steps: [{ action: 'append', to: 'tags', value: ['new'] }],
    };
    const records = await runArshileTest(dsl, {});
    expect(records[0].attrs['tags']).toEqual(['new']);
  });

  it('date: parses an epoch_millis timestamp into unix nanoseconds', async () => {
    const dsl: StreamlangDSL = {
      steps: [{ action: 'date', from: 'ts_ms', formats: ['epoch_millis'], to: 'ts' }],
    };
    const records = await runArshileTest(dsl, { ts_ms: '1710498600000' });
    // epoch_millis × 1_000_000 = nanoseconds
    expect(records[0].attrs['ts']).toBe(1710498600000 * 1_000_000);
  });

  it('json_extract: extracts a nested field from a JSON string', async () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          action: 'json_extract',
          field: 'payload',
          extractions: [{ selector: 'user.name', target_field: 'username' }],
        },
      ],
    };
    const records = await runArshileTest(dsl, {
      payload: JSON.stringify({ user: { name: 'alice' } }),
    });
    expect(records[0].attrs['username']).toBe('alice');
  });

  it('drop_document: drops log records matching the condition', async () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          action: 'drop_document',
          where: { field: 'level', eq: 'debug' },
        },
      ],
    };
    const records = await runArshileTest(dsl, { level: 'debug' });
    // The filtered document should not appear in the output.
    expect(records).toHaveLength(0);
  });

  it('drop_document: preserves records that do not match the condition', async () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          action: 'drop_document',
          where: { field: 'level', eq: 'debug' },
        },
      ],
    };
    const records = await runArshileTest(dsl, { level: 'info' });
    expect(records).toHaveLength(1);
  });
});
