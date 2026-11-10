/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DESTINATION_SIGNALS,
  PREFIXED_DESTINATION_SIGNALS,
  SIGNAL_INDEX_FIELDS,
  composeStaticIndexesForAll,
  getStaticIndexRemainder,
} from './destination_models';
import type {
  DestinationSignal,
  ElasticsearchDestinationFormData,
  RemoteElasticsearchDestinationFormData,
} from './types';

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

const hasSignalPrefix = (value: string): boolean =>
  PREFIXED_DESTINATION_SIGNALS.some((signal) => value.startsWith(`${signal}-`));

const composesTo = (input: string, indexes: SignalIndexes): boolean => {
  const composed = composeStaticIndexesForAll(input);
  return PREFIXED_DESTINATION_SIGNALS.every(
    (signal) => composed[SIGNAL_INDEX_FIELDS[signal]] === indexes[SIGNAL_INDEX_FIELDS[signal]]
  );
};

/** Shared Fixed field text that composes to these indexes, keeping a signal prefix the user typed. */
export const getSharedIndexInput = (indexes: SignalIndexes): string =>
  composesTo(indexes.logsIndex, indexes)
    ? indexes.logsIndex
    : getStaticIndexRemainder('logs', indexes.logsIndex);

const getUniqueValue = (values: string[]): string =>
  values.length > 0 && values.every((value) => value === values[0]) ? values[0] : '';

/** Remainder to keep when local naming switches to shared, or '' when that would change a name. */
export const getSharedRemainderOnSwitch = (indexes: SignalIndexes): string => {
  const filled = PREFIXED_DESTINATION_SIGNALS.map((signal) => ({
    signal,
    value: indexes[SIGNAL_INDEX_FIELDS[signal]].trim(),
  })).filter(({ value }) => value !== '');

  if (!filled.every(({ signal, value }) => value.startsWith(`${signal}-`))) {
    return '';
  }

  const remainder = getUniqueValue(
    filled.map(({ signal, value }) => getStaticIndexRemainder(signal, value))
  );
  // Composing a prefixed remainder breaks other signals: metrics-logs-default alone would give logs-default.
  if (!remainder || hasSignalPrefix(remainder)) {
    return '';
  }

  const composed = composeStaticIndexesForAll(remainder);
  return filled.every(({ signal, value }) => composed[SIGNAL_INDEX_FIELDS[signal]] === value)
    ? remainder
    : '';
};

/** The remote index to keep when naming switches to one name, or '' when filled names differ. */
export const getSharedRemoteIndexOnSwitch = (
  indexes: Pick<
    RemoteElasticsearchDestinationFormData,
    'logsIndex' | 'metricsIndex' | 'tracesIndex'
  >
): string =>
  getUniqueValue(
    PREFIXED_DESTINATION_SIGNALS.map((signal) =>
      indexes[SIGNAL_INDEX_FIELDS[signal]].trim()
    ).filter((value) => value !== '')
  );
