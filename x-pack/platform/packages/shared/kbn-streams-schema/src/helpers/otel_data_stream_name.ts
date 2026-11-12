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
  | 'typeSuffix'
  | 'partTooLong';

export const OTEL_TYPE_SEPARATOR = '.otel-';
export const PROMETHEUS_TYPE_SEPARATOR = '.prometheus-';
/** Elasticsearch cuts Prometheus remote write path parts to 100 characters. */
export const MAX_OTEL_DATA_STREAM_PART_LENGTH = 100;
/** The Elasticsearch exporter keeps 100 bytes of each part, and a dataset's `.otel` comes out of that. */
export const MAX_OTEL_DATASET_BYTES = 95;
export const MAX_OTEL_NAMESPACE_BYTES = 100;
// Streams adds the suffix of the data model, so a dataset ending in one would get it twice.
const DATASET_TYPE_SUFFIXES = ['.otel', '.prometheus'];

const byteLength = (part: string): number => new TextEncoder().encode(part).length;
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

const validatePart = (part: string, maxBytes: number): OtelDataStreamNameError | undefined => {
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
  if (byteLength(part) > maxBytes) {
    return 'partTooLong';
  }
  return undefined;
};

/**
 * Checks the parts of an OTel data stream name as given, so trim them first. Mirrors streams-transpiler
 * `checkDataset` and `checkNamespace`, and also keeps `-` out of the namespace, as Fleet does.
 */
export const validateOtelDataStreamName = ({
  dataset,
  namespace,
}: OtelDataStreamName): OtelDataStreamNameError | undefined => {
  if (!dataset.trim()) {
    return 'datasetRequired';
  }
  if (!namespace.trim()) {
    return 'namespaceRequired';
  }
  const partError =
    validatePart(dataset, MAX_OTEL_DATASET_BYTES) ??
    validatePart(namespace, MAX_OTEL_NAMESPACE_BYTES);
  if (partError) {
    return partError;
  }
  return DATASET_TYPE_SUFFIXES.some((suffix) => dataset.endsWith(suffix))
    ? 'typeSuffix'
    : undefined;
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
  return name ? validateOtelDataStreamName(name) : 'shape';
};
