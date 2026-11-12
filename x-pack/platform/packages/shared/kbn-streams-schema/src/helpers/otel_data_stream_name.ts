/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INVALID_STREAM_NAME_CHARACTERS, RESERVED_STREAM_NAMES } from './stream_name_validation';

export type OtelDataStreamSignal = 'logs' | 'metrics' | 'traces';

export interface OtelDataStreamName {
  dataset: string;
  namespace: string;
}

export type OtelDataStreamNameError =
  | 'datasetRequired'
  | 'namespaceRequired'
  | 'template'
  | 'uppercase'
  | 'hyphen'
  | 'invalidCharacter'
  | 'invalidName'
  | 'partTooLong'
  | 'tooLong';

export const OTEL_TYPE_SEPARATOR = '.otel-';
export const PROMETHEUS_TYPE_SEPARATOR = '.prometheus-';
/** Elasticsearch cuts Prometheus remote write path parts to 100 characters. */
export const MAX_OTEL_DATA_STREAM_PART_LENGTH = 100;
/** Backing indices are `.ds-<name>-yyyy.MM.dd-000001`, 22 bytes longer, and index names cap at 255 bytes. */
export const MAX_OTEL_DATA_STREAM_NAME_BYTES = 233;

const exceedsIndexNameBytes = (name: string): boolean =>
  new TextEncoder().encode(name).length > MAX_OTEL_DATA_STREAM_NAME_BYTES;
const TEMPLATE_PATTERN = /\{\{|\$\{/;
// Format and default-ignorable characters, like a zero-width space, make a name you can't see.
const WHITESPACE_CONTROL_OR_INVISIBLE_CHARS =
  /[\p{White_Space}\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}]/u;

export const composeOtelDataStreamName = (
  signal: OtelDataStreamSignal,
  { dataset, namespace }: OtelDataStreamName
): string => `${signal}-${dataset.trim()}${OTEL_TYPE_SEPARATOR}${namespace.trim()}`;

/** Splits `<signal>-<dataset>.otel-<namespace>`, or returns undefined when the name has another shape. */
export const parseOtelDataStreamName = (
  signal: OtelDataStreamSignal,
  index: string
): OtelDataStreamName | undefined => {
  const prefix = `${signal}-`;
  if (!index.startsWith(prefix)) {
    return undefined;
  }
  const rest = index.slice(prefix.length);
  const separatorAt = rest.lastIndexOf(OTEL_TYPE_SEPARATOR);
  if (separatorAt < 0) {
    return undefined;
  }
  return {
    dataset: rest.slice(0, separatorAt),
    namespace: rest.slice(separatorAt + OTEL_TYPE_SEPARATOR.length),
  };
};

const validatePart = (part: string): OtelDataStreamNameError | undefined => {
  if (TEMPLATE_PATTERN.test(part)) {
    return 'template';
  }
  if (part !== part.toLowerCase()) {
    return 'uppercase';
  }
  if (part.includes('-')) {
    return 'hyphen';
  }
  if (
    INVALID_STREAM_NAME_CHARACTERS.some((char) => part.includes(char)) ||
    WHITESPACE_CONTROL_OR_INVISIBLE_CHARS.test(part)
  ) {
    return 'invalidCharacter';
  }
  if (RESERVED_STREAM_NAMES.includes(part)) {
    return 'invalidName';
  }
  if (part.length > MAX_OTEL_DATA_STREAM_PART_LENGTH) {
    return 'partTooLong';
  }
  return undefined;
};

/** Checks the parts of an OTel data stream name. They are checked as given, so trim them first. */
export const validateOtelDataStreamName = (
  signal: OtelDataStreamSignal,
  name: OtelDataStreamName
): OtelDataStreamNameError | undefined => {
  const { dataset, namespace } = name;
  if (!dataset.trim()) {
    return 'datasetRequired';
  }
  if (!namespace.trim()) {
    return 'namespaceRequired';
  }
  const partError = validatePart(dataset) ?? validatePart(namespace);
  if (partError) {
    return partError;
  }
  // Prometheus remote write for a metrics name lands in the longer `.prometheus-` data stream.
  const tooLong =
    exceedsIndexNameBytes(composeOtelDataStreamName(signal, name)) ||
    (signal === 'metrics' &&
      exceedsIndexNameBytes(`metrics-${dataset}${PROMETHEUS_TYPE_SEPARATOR}${namespace}`));
  return tooLong ? 'tooLong' : undefined;
};

/**
 * Checks a fixed index for a signal. The Elasticsearch exporter writes in OTel mapping mode, and only
 * `*.otel-*` data streams have the templates for it, so any other shape fails at ingest.
 */
export const validateOtelDataStreamIndex = (
  signal: OtelDataStreamSignal,
  index: string
): OtelDataStreamNameError | 'shape' | undefined => {
  const name = parseOtelDataStreamName(signal, index);
  return name ? validateOtelDataStreamName(signal, name) : 'shape';
};
