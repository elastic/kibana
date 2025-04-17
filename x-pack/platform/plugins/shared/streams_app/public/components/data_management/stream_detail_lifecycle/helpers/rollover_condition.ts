/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IlmPolicyHotPhase } from '@kbn/streams-schema';

export function rolloverCondition(rollover?: IlmPolicyHotPhase['rollover']) {
  const conditions = [
    rollover?.max_age &&
      i18n.translate('xpack.streams.streamDetailLifecycle.rolloverConditionMaxAge', {
        defaultMessage: 'max age {maxAge}',
        values: { maxAge: rollover.max_age },
      }),
    rollover?.max_docs &&
      i18n.translate('xpack.streams.streamDetailLifecycle.rolloverConditionMaxDocs', {
        defaultMessage: 'max docs {maxDocs}',
        values: { maxDocs: rollover.max_docs },
      }),
    rollover?.max_primary_shard_docs &&
      i18n.translate('xpack.streams.streamDetailLifecycle.rolloverConditionMaxPrimaryShardDocs', {
        defaultMessage: 'primary shard docs {shardDocs}',
        values: { shardDocs: rollover.max_primary_shard_docs },
      }),
    rollover?.max_primary_shard_size &&
      i18n.translate('xpack.streams.streamDetailLifecycle.rolloverConditionMaxPrimaryShardSize', {
        defaultMessage: 'primary shard size {shardSize}',
        values: { shardSize: rollover.max_primary_shard_size },
      }),
    rollover?.max_size &&
      i18n.translate('xpack.streams.streamDetailLifecycle.rolloverConditionMaxSize', {
        defaultMessage: 'index size {maxSize}',
        values: { maxSize: rollover.max_size },
      }),
  ].filter(Boolean);

  return conditions.join(
    i18n.translate('xpack.streams.streamDetailLifecycle.rolloverConditionOr', {
      defaultMessage: ' or ',
    })
  );
}
