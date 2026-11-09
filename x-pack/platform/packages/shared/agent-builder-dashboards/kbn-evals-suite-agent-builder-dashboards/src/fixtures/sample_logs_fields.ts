/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SAMPLE_LOGS_INDEX = 'kibana_sample_data_logs';

/**
 * Every field mapped on `kibana_sample_data_logs`, including `.keyword`
 * multi-fields, transcribed from the sample data set's field mappings
 * (`src/platform/plugins/shared/home/server/services/sample_data/data_sets/logs/field_mappings.ts`).
 * A control on any other field queries `FROM <index> | STATS BY <field>` against
 * a column the index does not have and renders "Unknown column".
 */
export const SAMPLE_LOGS_MAPPED_FIELDS: readonly string[] = [
  '@timestamp',
  'agent',
  'agent.keyword',
  'bytes',
  'bytes_counter',
  'bytes_gauge',
  'clientip',
  'event.dataset',
  'extension',
  'extension.keyword',
  'geo.coordinates',
  'geo.dest',
  'geo.src',
  'geo.srcdest',
  'host',
  'host.keyword',
  'ip',
  'ip_range',
  'machine.os',
  'machine.os.keyword',
  'machine.ram',
  'memory',
  'message',
  'message.keyword',
  'phpmemory',
  'referer',
  'request',
  'request.keyword',
  'response',
  'response.keyword',
  'tags',
  'tags.keyword',
  'timestamp',
  'timestamp_range',
  'url',
  'url.keyword',
  'utc_time',
];
