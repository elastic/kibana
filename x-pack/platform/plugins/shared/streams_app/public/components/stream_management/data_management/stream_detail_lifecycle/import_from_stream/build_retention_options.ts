/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { IlmPolicyForFlyout } from '@kbn/data-lifecycle-phases';
import { getIlmPolicySummaryStats } from '@kbn/data-lifecycle-phases';
import type { EffectiveFailureStore, IngestStreamEffectiveLifecycle } from '@kbn/streams-schema';
import {
  isDslLifecycle,
  isEnabledFailureStore,
  isEnabledLifecycleFailureStore,
  isIlmLifecycle,
} from '@kbn/streams-schema';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import type { ImportLifecycleOption } from '../data_phases/import_lifecycle_flyout';
import {
  IMPORT_METHOD_DLM,
  IMPORT_METHOD_ILM,
} from '../data_phases/import_lifecycle_flyout/constants';
import { sourceHasDownsampling } from './get_imported_lifecycle';

const INDEFINITE_RETENTION_LABEL = i18n.translate(
  'xpack.streams.importLifecycle.retentionSummary.indefinite',
  { defaultMessage: '∞' }
);

const getRetentionLabel = (retention?: string | null): string =>
  retention ?? INDEFINITE_RETENTION_LABEL;

const phasesLabel = (count: number): string =>
  i18n.translate('xpack.streams.importLifecycle.retentionSummary.phases', {
    defaultMessage: '{count, plural, one {# phase} other {# phases}}',
    values: { count },
  });

const downsamplesLabel = (count: number): string =>
  i18n.translate('xpack.streams.importLifecycle.retentionSummary.downsamples', {
    defaultMessage: '{count, plural, one {# downsample} other {# downsamples}}',
    values: { count },
  });

const SUCCESS_CATEGORY_LABEL = i18n.translate(
  'xpack.streams.importLifecycle.retentionSummary.successCategory',
  { defaultMessage: 'Success' }
);

const FAIL_CATEGORY_LABEL = i18n.translate(
  'xpack.streams.importLifecycle.retentionSummary.failCategory',
  { defaultMessage: 'Fail' }
);

// Failure store summary (picker row's second line): a hot phase, plus a delete
// phase once a retention is set. Returns `undefined` when it isn't enabled.
const getFailureStoreDescriptionParts = (
  effectiveFailureStore: EffectiveFailureStore | undefined
): string[] | undefined => {
  if (!effectiveFailureStore || !isEnabledFailureStore(effectiveFailureStore)) {
    return undefined;
  }

  const dataRetention = isEnabledLifecycleFailureStore(effectiveFailureStore)
    ? effectiveFailureStore.lifecycle.enabled.data_retention
    : undefined;

  return [getRetentionLabel(dataRetention), phasesLabel(dataRetention ? 2 : 1)];
};

const getDslDataPhaseCount = (
  dsl: { data_retention?: string; frozen_after?: string },
  isServerless: boolean
): number => 1 + (!isServerless && dsl.frozen_after ? 1 : 0) + (dsl.data_retention ? 1 : 0);

const buildOptionForLifecycle = (
  streamName: string,
  effectiveLifecycle: IngestStreamEffectiveLifecycle,
  ilmPoliciesByName: Map<string, IlmPolicyForFlyout>,
  isServerless: boolean,
  effectiveFailureStore: EffectiveFailureStore | undefined
): ImportLifecycleOption | undefined => {
  const failureStoreDescriptionParts = getFailureStoreDescriptionParts(effectiveFailureStore);
  const failureStoreFields = failureStoreDescriptionParts
    ? {
        descriptionCategorySecondLine: FAIL_CATEGORY_LABEL,
        descriptionPartsSecondLine: failureStoreDescriptionParts,
      }
    : {};

  if (isIlmLifecycle(effectiveLifecycle)) {
    const policyName = effectiveLifecycle.ilm.policy;
    const policy = ilmPoliciesByName.get(policyName);

    if (!policy) {
      // Policy details unavailable (e.g. missing privileges): show just the name.
      return {
        name: streamName,
        method: IMPORT_METHOD_ILM,
        descriptionCategory: SUCCESS_CATEGORY_LABEL,
        descriptionParts: [policyName],
        badge: IMPORT_METHOD_ILM.toUpperCase(),
        ...failureStoreFields,
      };
    }

    const { deleteAfter, phaseCount, downsampleStepCount } = getIlmPolicySummaryStats(
      policy.phases
    );
    const descriptionParts = [getRetentionLabel(deleteAfter), phasesLabel(phaseCount)];
    if (downsampleStepCount > 0) {
      descriptionParts.push(downsamplesLabel(downsampleStepCount));
    }

    return {
      name: streamName,
      method: IMPORT_METHOD_ILM,
      descriptionCategory: SUCCESS_CATEGORY_LABEL,
      descriptionParts,
      badge: IMPORT_METHOD_ILM.toUpperCase(),
      inspectable: Boolean(policy.serializedPolicy),
      hasDownsampling: sourceHasDownsampling({ effectiveLifecycle, ilmPoliciesByName }),
      ...failureStoreFields,
    };
  }

  if (isDslLifecycle(effectiveLifecycle)) {
    const { dsl } = effectiveLifecycle;
    const downsampleStepCount = dsl.downsample?.length ?? 0;
    const descriptionParts = [
      getRetentionLabel(dsl.data_retention),
      phasesLabel(getDslDataPhaseCount(dsl, isServerless)),
    ];
    if (downsampleStepCount > 0) {
      descriptionParts.push(downsamplesLabel(downsampleStepCount));
    }

    return {
      name: streamName,
      method: IMPORT_METHOD_DLM,
      descriptionCategory: SUCCESS_CATEGORY_LABEL,
      descriptionParts,
      hasDownsampling: sourceHasDownsampling({ effectiveLifecycle, ilmPoliciesByName }),
      ...failureStoreFields,
    };
  }

  return undefined;
};

export const buildImportRetentionOptions = ({
  streams,
  currentStreamName,
  ilmPoliciesByName,
  isServerless,
}: {
  streams: ListStreamDetail[];
  currentStreamName: string;
  ilmPoliciesByName: Map<string, IlmPolicyForFlyout>;
  isServerless: boolean;
}): ImportLifecycleOption[] => {
  return streams
    .filter((stream) => stream.stream.name !== currentStreamName)
    .filter((stream) => stream.privileges.read_failure_store)
    .flatMap((stream) => {
      const { effective_lifecycle: effectiveLifecycle } = stream;
      if (!effectiveLifecycle) {
        return [];
      }
      const option = buildOptionForLifecycle(
        stream.stream.name,
        effectiveLifecycle,
        ilmPoliciesByName,
        isServerless,
        stream.effective_failure_store
      );
      return option ? [option] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};
