/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';

/** OTLP JSON `AnyValue` — https://github.com/open-telemetry/opentelemetry-proto */
interface OtlpAnyValue {
  stringValue?: string;
  intValue?: string | number;
  doubleValue?: number;
  boolValue?: boolean;
  arrayValue?: { values: OtlpAnyValue[] };
}

interface OtlpLogRecord {
  attributes?: Array<{ key: string; value: OtlpAnyValue }>;
}

/** A flattened `{ 'event.action': 'user_login', 'kibana.space.id': 'default' }`-style map. */
export type FlatAttributes = Record<string, unknown>;

const unwrapAnyValue = (value: OtlpAnyValue | undefined): unknown => {
  if (!value) return undefined;
  if (value.arrayValue) return value.arrayValue.values.map(unwrapAnyValue);
  if ('stringValue' in value) return value.stringValue;
  if ('intValue' in value) return Number(value.intValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('boolValue' in value) return value.boolValue;
  return undefined;
};

const toFlatAttributes = (record: OtlpLogRecord): FlatAttributes => {
  const attrs: FlatAttributes = {};
  for (const { key, value } of record.attributes ?? []) {
    attrs[key] = unwrapAnyValue(value);
  }
  return attrs;
};

const readBody = (req: http.IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });

/**
 * A scoped view of an `OtlpLogReceiver` that only sees records captured after
 * the snapshot was taken. Call `receiver.snapshot()` at the top of each test
 * before triggering any actions — this ensures records from earlier tests
 * (including late-arriving batch flushes) are structurally excluded.
 */
export class OtlpLogReceiverSnapshot {
  constructor(private readonly records: FlatAttributes[], private readonly startIndex: number) {}

  /** Polls records captured since this snapshot was taken until one matches `predicate`. */
  async waitForLogRecord(
    predicate: (attrs: FlatAttributes) => boolean,
    timeoutMs = 15_000
  ): Promise<FlatAttributes> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const match = this.records.slice(this.startIndex).find(predicate);
      if (match) return match;
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error(`Timed out waiting ${timeoutMs}ms for a matching OTLP log record`);
  }
}

/**
 * A fake OTLP/HTTP logs receiver standing in for a real OpenTelemetry Collector.
 *
 * Kibana's OTel audit appender (`protocol: 'http'`) POSTs OTLP JSON-encoded
 * `ExportLogsServiceRequest` bodies — this captures them directly so tests can
 * assert on the exact attribute shape the appender emits, without depending on
 * a real collector + Elasticsearch ingest pipeline.
 *
 * Never call `waitForLogRecord` directly on this class. Instead, call
 * `snapshot()` at the top of each test to get a scoped view that only sees
 * records captured after that point.
 */
export class OtlpLogReceiver {
  private server: http.Server | null = null;
  private readonly records: FlatAttributes[] = [];

  async start(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        readBody(req)
          .then((rawBody) => {
            const payload = rawBody ? JSON.parse(rawBody) : {};
            for (const resourceLog of payload.resourceLogs ?? []) {
              for (const scopeLog of resourceLog.scopeLogs ?? []) {
                for (const logRecord of scopeLog.logRecords ?? []) {
                  this.records.push(toFlatAttributes(logRecord));
                }
              }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end('{}');
          })
          .catch((error) => {
            res.writeHead(500);
            res.end(String(error));
          });
      });

      this.server.listen(port, () => resolve());
      this.server.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  /** Returns a snapshot scoped to records captured from this moment onward. Call this at the top of each test before triggering any actions. */
  snapshot(): OtlpLogReceiverSnapshot {
    return new OtlpLogReceiverSnapshot(this.records, this.records.length);
  }
}
