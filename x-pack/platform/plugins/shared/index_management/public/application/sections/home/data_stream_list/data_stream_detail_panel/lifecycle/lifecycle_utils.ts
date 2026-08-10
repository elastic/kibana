/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isEnabledFailureStore,
  isEnabledLifecycleFailureStore,
  isDisabledLifecycleFailureStore,
  isRoot,
} from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';

import type { DataStream, TemplateDeserialized } from '../../../../../../../common';
import { isRecord } from '../../../../../../../common/lib';

export { isRecord };

/** Resolved failure store configuration shared by the summary and the edit flyout. */
export interface ResolvedFailureStore {
  enabled: boolean;
  retention?: string;
  retentionDisabled?: boolean;
}

/**
 * A wired stream is one managed by the Streams app, marked with `_meta.managed_by === 'streams'`.
 * Its lifecycle is inherited from its Streams parent (not the index template). Classic data
 * streams — even when adopted/visible in the Streams app — are not wired and resolve from their
 * index template instead.
 */
export const isWiredStreamDataStream = (stream: DataStream | null | undefined): boolean => {
  const meta = stream?._meta;
  if (!isRecord(meta)) return false;
  return meta.managed_by === 'streams';
};

/**
 * A wired stream that is also a root has no parent to inherit from, so nothing about its
 * lifecycle should ever be presented as inherited.
 */
export const isWiredRootDataStream = (stream: DataStream | null | undefined): boolean =>
  isWiredStreamDataStream(stream) && typeof stream?.name === 'string' && isRoot(stream.name);

/**
 * Normalizes an Elasticsearch data stream lifecycle so `enabled`/`data_retention`/`frozen_after`
 * are comparable: `enabled` is inferred when omitted but retention values are present, and only
 * meaningful retention values (a non-empty string or the infinite `-1`) are kept.
 */
export const normalizeEsLifecycle = (lifecycle?: DataStream['lifecycle']) => {
  const hasLifecycleValues =
    (typeof lifecycle?.data_retention === 'string' && lifecycle.data_retention.length > 0) ||
    lifecycle?.data_retention === -1 ||
    (typeof lifecycle?.frozen_after === 'string' && lifecycle.frozen_after.length > 0);

  return {
    enabled: lifecycle?.enabled === true || (lifecycle?.enabled == null && hasLifecycleValues),
    data_retention:
      (typeof lifecycle?.data_retention === 'string' && lifecycle.data_retention.length > 0) ||
      lifecycle?.data_retention === -1
        ? lifecycle.data_retention
        : undefined,
    frozen_after:
      typeof lifecycle?.frozen_after === 'string' && lifecycle.frozen_after.length > 0
        ? lifecycle.frozen_after
        : undefined,
  };
};

/**
 * Extracts the ILM policy name and `prefer_ilm` flag configured on an index template's
 * `index.lifecycle` settings. Shared by the details summary and the edit flyout so both resolve
 * template-inherited ILM identically.
 *
 * @param fallbackToTemplateIlmPolicy When the index settings don't name a policy, fall back to the
 * template's resolved `ilmPolicy.name` (used by the summary; the edit flyout leaves it undefined).
 */
export const getTemplateIlmSettings = (
  template: TemplateDeserialized,
  { fallbackToTemplateIlmPolicy = false }: { fallbackToTemplateIlmPolicy?: boolean } = {}
): { templateIlmName: string | undefined; preferIlm: boolean } => {
  const templateSettings = template.template?.settings;
  const templateIndexSettings = isRecord(templateSettings) ? templateSettings : undefined;
  const templateIndexRaw = templateIndexSettings?.index;
  const templateIndex = isRecord(templateIndexRaw) ? templateIndexRaw : undefined;
  const templateIndexLifecycle = isRecord(templateIndex?.lifecycle)
    ? templateIndex.lifecycle
    : undefined;
  const templateIlmNameRaw = templateIndexLifecycle?.name;
  const templateIlmName =
    typeof templateIlmNameRaw === 'string' && templateIlmNameRaw.length > 0
      ? templateIlmNameRaw
      : fallbackToTemplateIlmPolicy
      ? template.ilmPolicy?.name
      : undefined;
  const preferIlmRaw = templateIndexLifecycle?.prefer_ilm;
  const preferIlm = typeof preferIlmRaw === 'boolean' ? preferIlmRaw : true; // ES default

  return { templateIlmName, preferIlm };
};

/**
 * Converts a Streams DSL lifecycle (`.dsl`) into the Elasticsearch lifecycle summary shape used
 * across the detail panel. Only string retention values are kept (the numeric infinite form is
 * not surfaced here).
 */
export const streamsDslToEsLifecycle = (dsl: {
  data_retention?: unknown;
  frozen_after?: unknown;
}): DataStream['lifecycle'] => ({
  enabled: true,
  ...(typeof dsl.data_retention === 'string' ? { data_retention: dsl.data_retention } : {}),
  ...(typeof dsl.frozen_after === 'string' ? { frozen_after: dsl.frozen_after } : {}),
});

/**
 * Converts a Streams effective failure store into the resolved failure store shape shared by the
 * summary and the edit flyout.
 */
export const resolveStreamsFailureStore = (
  effectiveFailureStore: Streams.ingest.all.GetResponse['effective_failure_store']
): ResolvedFailureStore => ({
  enabled: isEnabledFailureStore(effectiveFailureStore),
  retention:
    isEnabledLifecycleFailureStore(effectiveFailureStore) &&
    typeof effectiveFailureStore.lifecycle.enabled.data_retention === 'string'
      ? effectiveFailureStore.lifecycle.enabled.data_retention
      : undefined,
  retentionDisabled: isDisabledLifecycleFailureStore(effectiveFailureStore),
});
