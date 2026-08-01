/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isExcludedLoggingPath } from './constants';
import { codeGrep, fetchLineWindows, splitRepository } from './discover_logging_sites';
import type { OtelMetricKind, OtelSignal, OtelSignalKind, OtelValueHint } from './types';

const EXTRACT_PATTERNS: readonly string[] = [
  '.*(startSpan|start_as_current_span|startActiveSpan|spanBuilder|StartActivity|[.]Start[(]).*',
  '.*(addEvent|add_event|AddEvent|ActivityEvent).*',
  '.*(setAttribute|setAttributes|set_attribute|SetTag|SpanAttribute).*',
  '.*(createCounter|createUpDownCounter|createHistogram|createObservableGauge|createObservableCounter|create_counter|create_histogram|Int64Counter|Float64Counter|counterBuilder|histogramBuilder|Gauge).*',
  '.*(setStatus|set_status|SetStatus).*(ERROR|Error|kError|codes[.]Error).*',
  '.*(recordException|record_exception|RecordError|record_error).*',
] as const;

const LANGUAGE_BY_EXTENSION: Readonly<Record<string, string>> = {
  ts: 'TypeScript',
  tsx: 'TypeScript',
  js: 'JavaScript',
  jsx: 'JavaScript',
  go: 'Go',
  py: 'Python',
  java: 'Java',
  kt: 'Kotlin',
  cs: 'C#',
  cpp: 'C++',
  cc: 'C++',
  cxx: 'C++',
  rs: 'Rust',
  rb: 'Ruby',
  php: 'PHP',
};

const languageOf = (file: string): string => {
  const extension = file.slice(file.lastIndexOf('.') + 1).toLowerCase();
  return LANGUAGE_BY_EXTENSION[extension] ?? (extension || 'unknown');
};

const inferValueHint = (key: string, expression = ''): OtelValueHint => {
  const normalized = `${key} ${expression}`.toLowerCase();
  if (/\b(true|false|bool(?:ean)?)\b/.test(normalized)) return 'bool';
  if (/(?:^|[._])(count|amount|total|duration|latency|size|length|ms|seconds?)$/.test(key)) {
    return 'number';
  }
  if (/\b\d+(?:\.\d+)?\b/.test(expression)) return 'number';
  if (/(?:^|[._])id$/.test(key)) return 'id';
  if (/enum|status|type|kind|state/.test(normalized)) return 'enum';
  return 'unknown';
};

const isSemconvAttribute = (key: string): boolean => /^(?:http|db|rpc|net|messaging)\./.test(key);

/** Infers the metric instrument kind from the matched constructor token. */
const metricKindFromToken = (token: string): OtelMetricKind => {
  const normalized = token.toLowerCase();
  if (normalized.includes('histogram')) return 'histogram';
  if (normalized.includes('updown')) return 'updown';
  if (normalized.includes('gauge')) return 'gauge';
  return 'counter';
};

const literalSignal = ({
  kind,
  raw,
  language,
  file,
  line,
  valueHint,
  metricKind,
}: {
  kind: OtelSignalKind;
  raw: string;
  language: string;
  file: string;
  line: number;
  valueHint?: OtelValueHint;
  metricKind?: OtelMetricKind;
}): OtelSignal | undefined => {
  const interpolation = raw.search(/\$\{|#\{|%[a-zA-Z]|\{[^}]+\}/);
  const templated = interpolation !== -1;
  const value = (templated ? raw.slice(0, interpolation) : raw).trim().replace(/[.\s_-]+$/, '');
  if (!value) return undefined;
  return {
    kind,
    value,
    valueHint,
    templated: templated || undefined,
    language,
    file,
    line,
    ...(metricKind ? { metricKind } : {}),
  };
};

export interface OtelSourceWindow {
  file: string;
  line: number;
  content: string;
}

/** Extracts signals from source windows returned by the indexed grep substrate. */
export function extractOtelSignalsFromWindows(windows: OtelSourceWindow[]): OtelSignal[] {
  const signals: OtelSignal[] = [];
  const seen = new Set<string>();
  const add = (signal: OtelSignal | undefined) => {
    if (!signal) return;
    const key = `${signal.kind}:${signal.value ?? ''}:${signal.file}:${signal.line}`;
    if (!seen.has(key)) {
      seen.add(key);
      signals.push(signal);
    }
  };

  for (const { file, line, content } of windows) {
    if (isExcludedLoggingPath(file)) continue;
    const language = languageOf(file);
    const spanPattern =
      /(?:startSpan|startActiveSpan|start_as_current_span|spanBuilder|StartActivity|in_span)\s*\(\s*(["'`])([^"'`]+)\1|(?:tracer\s*\.)?Start\s*\(\s*[^,]+,\s*(["'`])([^"'`]+)\3/gi;
    for (const match of content.matchAll(spanPattern)) {
      add(literalSignal({ kind: 'span_name', raw: match[2] ?? match[4], language, file, line }));
    }

    const eventPattern =
      /(?:addEvent|add_event|AddEvent)\s*\(\s*(?:new\s+(?:ActivityEvent)?\s*\(\s*)?(["'`])([^"'`]+)\1/gi;
    for (const match of content.matchAll(eventPattern)) {
      add(literalSignal({ kind: 'event_name', raw: match[2], language, file, line }));
    }

    const attributePattern =
      /(?:setAttribute|set_attribute|SetTag|SpanAttribute)\s*\(\s*(["'`])([a-zA-Z][\w.-]+)\1\s*,?\s*([^,)\n}]*)/gi;
    for (const match of content.matchAll(attributePattern)) {
      if (!isSemconvAttribute(match[2])) {
        add(
          literalSignal({
            kind: 'attr_key',
            raw: match[2],
            valueHint: inferValueHint(match[2], match[3]),
            language,
            file,
            line,
          })
        );
      }
    }

    const objectCallPattern = /setAttributes\s*\(\s*\{([\s\S]*?)\}\s*\)/gi;
    for (const objectMatch of content.matchAll(objectCallPattern)) {
      const keyPattern = /(?:(["'`])([a-zA-Z][\w.-]+)\1|([a-zA-Z_$][\w$]*))\s*:\s*([^,}\n]+)/g;
      for (const keyMatch of objectMatch[1].matchAll(keyPattern)) {
        const key = keyMatch[2] ?? keyMatch[3];
        if (!isSemconvAttribute(key)) {
          add(
            literalSignal({
              kind: 'attr_key',
              raw: key,
              valueHint: inferValueHint(key, keyMatch[4]),
              language,
              file,
              line,
            })
          );
        }
      }
    }

    const metricPattern =
      /(create_?(?:Observable)?(?:UpDownCounter|Counter|Histogram|Gauge)|Int64Counter|Float64Counter|Int64Histogram|Float64Histogram|Int64Gauge|Float64Gauge|counterBuilder|histogramBuilder|gaugeBuilder)\s*\(\s*(["'`])([^"'`]+)\2/gi;
    for (const match of content.matchAll(metricPattern)) {
      add(
        literalSignal({
          kind: 'metric_name',
          raw: match[3],
          language,
          file,
          line,
          metricKind: metricKindFromToken(match[1]),
        })
      );
    }

    if (
      /(?:setStatus|set_status|SetStatus)[\s\S]*(?:ERROR|Error|kError|codes\.Error)/.test(content)
    ) {
      add({ kind: 'error_status', language, file, line });
    }
    if (/(?:recordException|record_exception|RecordError|record_error)/.test(content)) {
      add({ kind: 'record_exception', language, file, line });
    }
  }
  return signals;
}

/** Extracts typed OTel instrumentation signals from one indexed service. Never throws. */
export async function extractOtelSignals({
  esClient,
  repository,
  gitSha,
  serviceRoot,
  logger,
  perPatternLimit = 1000,
}: {
  esClient: ElasticsearchClient;
  repository: string;
  gitSha: string;
  serviceRoot: string;
  logger: Logger;
  perPatternLimit?: number;
}): Promise<OtelSignal[]> {
  const { org, repo } = splitRepository(repository);
  const root = serviceRoot.replace(/^\.[/\\]?$/, '').replace(/\/+$/, '');
  const hitsByFile = new Map<string, Set<number>>();

  try {
    for (const regex of EXTRACT_PATTERNS) {
      const hits = await codeGrep({
        esClient,
        gitOrg: org,
        gitRepo: repo,
        gitCommit: gitSha || '*',
        filePath: root ? `${root}/**` : '**',
        regex,
        limit: perPatternLimit,
      });
      for (const hit of hits) {
        if (isExcludedLoggingPath(hit.filePath)) continue;
        const lines = hitsByFile.get(hit.filePath) ?? new Set<number>();
        lines.add(hit.lineNumber);
        hitsByFile.set(hit.filePath, lines);
      }
    }

    // Fetch a wider window than logging discovery: OTel builder/object calls
    // commonly put the method name and literal argument on adjacent lines.
    const expandedHitsByFile = new Map<string, Set<number>>();
    for (const [file, lineNumbers] of hitsByFile) {
      const expanded = new Set<number>();
      for (const line of lineNumbers) {
        expanded.add(line - 2);
        expanded.add(line);
        expanded.add(line + 2);
      }
      expandedHitsByFile.set(file, expanded);
    }
    const windows = await fetchLineWindows({
      esClient,
      gitOrg: org,
      gitRepo: repo,
      gitCommit: gitSha || '*',
      hitsByFile: expandedHitsByFile,
      logger,
    });
    const sourceWindows: OtelSourceWindow[] = [];
    for (const [file, lineNumbers] of hitsByFile) {
      for (const line of lineNumbers) {
        const fileLines = windows.get(file);
        sourceWindows.push({
          file,
          line,
          content: Array.from({ length: 7 }, (_, index) => line - 3 + index)
            .map((number) => fileLines?.get(number) ?? '')
            .join('\n'),
        });
      }
    }
    return extractOtelSignalsFromWindows(sourceWindows);
  } catch (error) {
    logger.warn(
      `otel_extraction: failed for "${repository}" @ "${root}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return [];
  }
}
