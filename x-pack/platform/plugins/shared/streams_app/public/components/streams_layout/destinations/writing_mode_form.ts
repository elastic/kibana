/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OtelDataStreamName } from '@kbn/streams-schema';
import {
  DESTINATION_SIGNALS,
  PREFIXED_DESTINATION_SIGNALS,
  SIGNAL_INDEX_FIELDS,
} from './destination_models';
import type { DestinationSignal, ElasticsearchDestinationFormData, StaticNames } from './types';

type SignalIndexes = Pick<
  ElasticsearchDestinationFormData,
  'logsIndex' | 'metricsIndex' | 'tracesIndex'
>;

/** Signals whose Automatic custom field holds a value, in signal order. */
export const getFilledCustomSignals = (
  elasticsearch: SignalIndexes & Pick<ElasticsearchDestinationFormData, 'docsWritePatterns'>
): DestinationSignal[] =>
  DESTINATION_SIGNALS.filter((signal) =>
    signal === 'docs'
      ? elasticsearch.docsWritePatterns.length > 0
      : elasticsearch[SIGNAL_INDEX_FIELDS[signal]].trim() !== ''
  );

/** The name to keep when naming switches to shared: the trimmed pair every signal with a dataset shares. */
export const getSharedOtelNameOnSwitch = (names: StaticNames): OtelDataStreamName | undefined => {
  const filled = PREFIXED_DESTINATION_SIGNALS.map((signal) => ({
    dataset: names[signal].dataset.trim(),
    namespace: names[signal].namespace.trim(),
  })).filter(({ dataset }) => dataset !== '');
  const [first] = filled;
  return first &&
    filled.every(
      ({ dataset, namespace }) => dataset === first.dataset && namespace === first.namespace
    )
    ? first
    : undefined;
};
