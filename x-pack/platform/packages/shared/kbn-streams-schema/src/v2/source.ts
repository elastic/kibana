/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DisplayFields, Identifier, NonEmptyArray } from './common';

export type SourceType =
  | 'otlp'
  | 'async_bulk'
  | 'prometheus_remote_write'
  | 'syslog'
  | 'es_otlp'
  | 'bulk'
  | 'es_prometheus_remote_write'
  | 'esql_query';

export type OtlpSignal = 'traces' | 'metrics' | 'logs';

export interface OtlpSourceConfig {
  signals?: NonEmptyArray<OtlpSignal>;
}

export type PrometheusRemoteWriteSourceConfig = Record<string, never>;

export interface SyslogSourceConfig {
  protocol?: 'tcp';
  port?: number;
}

export interface EsqlQuerySourceConfig {
  query: string;
}

interface BaseSource extends DisplayFields {
  id: Identifier;
  to: Identifier | null;
}

interface HttpSource {
  path_template?: string;
}

export interface OtlpSource extends BaseSource, HttpSource {
  type: 'otlp';
  config?: { otlp?: OtlpSourceConfig };
}

export interface AsyncBulkSource extends BaseSource, HttpSource {
  type: 'async_bulk';
  config?: never;
}

export interface PrometheusRemoteWriteSource extends BaseSource, HttpSource {
  type: 'prometheus_remote_write';
  config?: { prometheus_remote_write?: PrometheusRemoteWriteSourceConfig };
}

export interface SyslogSource extends BaseSource {
  type: 'syslog';
  path_template?: never;
  config?: { syslog?: SyslogSourceConfig };
}

export interface EsOtlpSource extends BaseSource, HttpSource {
  type: 'es_otlp';
  config?: { es_otlp?: OtlpSourceConfig };
}

export interface BulkSource extends BaseSource, HttpSource {
  type: 'bulk';
  config?: never;
}

export interface EsPrometheusRemoteWriteSource extends BaseSource, HttpSource {
  type: 'es_prometheus_remote_write';
  config?: { es_prometheus_remote_write?: PrometheusRemoteWriteSourceConfig };
}

export interface EsqlQuerySource extends BaseSource {
  type: 'esql_query';
  path_template?: never;
  config: { esql_query: EsqlQuerySourceConfig };
}

export type Source =
  | OtlpSource
  | AsyncBulkSource
  | PrometheusRemoteWriteSource
  | SyslogSource
  | EsOtlpSource
  | BulkSource
  | EsPrometheusRemoteWriteSource
  | EsqlQuerySource;
