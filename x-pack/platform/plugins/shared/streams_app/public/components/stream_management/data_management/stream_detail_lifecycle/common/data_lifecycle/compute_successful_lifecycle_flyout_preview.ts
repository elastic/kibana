/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { effectiveToIngestLifecycle } from '@kbn/streams-schema';
import type { DataLifecycleMethod, IlmPolicyForFlyout } from '@kbn/data-lifecycle-phases';
import { getIlmPolicySummaryStats } from '@kbn/data-lifecycle-phases';
import type { PolicyFromES } from '@kbn/index-lifecycle-management-common-shared';
import type { DownsampleStep } from '@kbn/streams-schema/src/models/ingest/lifecycle';
import type { LifecyclePhase } from './lifecycle_types';
import { buildDlmPreviewModel, buildIlmPreviewPhases, type IlmPhasesMap } from './preview_models';

export type SuccessfulLifecycleFlyoutPreview =
  | { action: 'clear' }
  | {
      action: 'apply';
      timelineModel: { phases: LifecyclePhase[]; downsampleSteps: DownsampleStep[] | null };
      retentionPeriod: string | null;
      dataPhasesCount: number;
      downsampleStepsCount: number | null;
      suppressUnsavedChanges?: boolean;
    };

export interface ComputeSuccessfulLifecycleFlyoutPreviewArgs {
  inheritLifecycle: boolean;
  inheritedEffectiveLifecycle: Streams.ingest.all.GetResponse['effective_lifecycle'] | null;
  method: DataLifecycleMethod;
  selectedIlmPolicyName: string | undefined;
  inspectedIlmPolicyName: string | null;
  selectedIlmPolicyNameAtInspect: string | undefined;
  ilmPolicies: IlmPolicyForFlyout[];
  effectiveLifecycle: Streams.ingest.all.GetResponse['effective_lifecycle'];
  indexMode: string | undefined;
  isServerless: boolean;
  ilmPhases: IlmPhasesMap;
  hotColor: string;
}

const previewFromSerializedIlmPolicy = ({
  policy,
  ilmPhases,
  indexMode,
}: {
  policy: PolicyFromES['policy'];
  ilmPhases: IlmPhasesMap;
  indexMode: string | undefined;
}): Extract<SuccessfulLifecycleFlyoutPreview, { action: 'apply' }> => {
  const phases = buildIlmPreviewPhases({ policy, ilmPhases });
  const { phaseCount, downsampleStepCount } = getIlmPolicySummaryStats(policy.phases);
  return {
    action: 'apply',
    timelineModel: { phases, downsampleSteps: null },
    retentionPeriod: policy.phases.delete?.min_age ?? null,
    dataPhasesCount: phaseCount,
    downsampleStepsCount: indexMode === 'time_series' ? downsampleStepCount : null,
  };
};

const previewForDlmSelection = ({
  effectiveLifecycle,
  isServerless,
  ilmPhases,
  hotColor,
  indexMode,
}: Pick<
  ComputeSuccessfulLifecycleFlyoutPreviewArgs,
  'effectiveLifecycle' | 'isServerless' | 'ilmPhases' | 'hotColor' | 'indexMode'
>): Extract<SuccessfulLifecycleFlyoutPreview, { action: 'apply' }> => {
  const baseline = effectiveToIngestLifecycle(effectiveLifecycle);
  const baselineDsl = 'dsl' in baseline ? baseline.dsl : {};
  const model = buildDlmPreviewModel({
    isServerless,
    hotColor,
    hotDescription: ilmPhases.hot.description,
    deletePhaseColor: ilmPhases.delete.color,
    deletePhaseDescription: ilmPhases.delete.description,
    frozenAfter: baselineDsl.frozen_after,
    frozenColor: ilmPhases.frozen.color,
    frozenDescription: ilmPhases.frozen.description,
    retentionPeriod: baselineDsl.data_retention,
    downsampleSteps: baselineDsl.downsample ?? null,
    indexMode: indexMode ?? 'standard',
  });

  return {
    action: 'apply',
    timelineModel: { phases: model.phases, downsampleSteps: model.downsampleSteps },
    retentionPeriod: model.retentionPeriod,
    dataPhasesCount: model.dataPhasesCount,
    downsampleStepsCount: model.downsampleStepsCount,
  };
};

const previewFromLifecycle = ({
  lifecycle,
  ilmPolicies,
  isServerless,
  ilmPhases,
  hotColor,
  indexMode,
}: {
  lifecycle: Streams.ingest.all.GetResponse['effective_lifecycle'];
  ilmPolicies: IlmPolicyForFlyout[];
} & Pick<
  ComputeSuccessfulLifecycleFlyoutPreviewArgs,
  'isServerless' | 'ilmPhases' | 'hotColor' | 'indexMode'
>): Extract<SuccessfulLifecycleFlyoutPreview, { action: 'apply' }> => {
  const baseline = effectiveToIngestLifecycle(lifecycle);
  if ('ilm' in baseline) {
    const found = ilmPolicies.find((p) => p.name === baseline.ilm.policy);
    if (found?.serializedPolicy) {
      return previewFromSerializedIlmPolicy({
        policy: found.serializedPolicy,
        ilmPhases,
        indexMode,
      });
    }
  }

  const retentionPeriod = 'dsl' in baseline ? baseline.dsl.data_retention : undefined;
  const downsampleSteps = 'dsl' in baseline ? baseline.dsl.downsample ?? null : null;
  const frozenAfter = 'dsl' in baseline ? baseline.dsl.frozen_after : undefined;
  const model = buildDlmPreviewModel({
    isServerless,
    hotColor,
    hotDescription: ilmPhases.hot.description,
    deletePhaseColor: ilmPhases.delete.color,
    deletePhaseDescription: ilmPhases.delete.description,
    frozenAfter,
    frozenColor: ilmPhases.frozen.color,
    frozenDescription: ilmPhases.frozen.description,
    retentionPeriod,
    downsampleSteps,
    indexMode: indexMode ?? 'standard',
  });

  return {
    action: 'apply',
    timelineModel: { phases: model.phases, downsampleSteps: model.downsampleSteps },
    retentionPeriod: model.retentionPeriod,
    dataPhasesCount: model.dataPhasesCount,
    downsampleStepsCount: model.downsampleStepsCount,
  };
};

export const computeSuccessfulLifecycleFlyoutPreview = (
  args: ComputeSuccessfulLifecycleFlyoutPreviewArgs
): SuccessfulLifecycleFlyoutPreview => {
  const {
    inheritLifecycle,
    inheritedEffectiveLifecycle,
    method,
    selectedIlmPolicyName,
    inspectedIlmPolicyName,
    selectedIlmPolicyNameAtInspect,
    ilmPolicies,
    effectiveLifecycle,
    indexMode,
    isServerless,
    ilmPhases,
    hotColor,
  } = args;

  if (inheritLifecycle) {
    if (!inheritedEffectiveLifecycle) {
      return { action: 'clear' };
    }

    const inheritedBaseline = effectiveToIngestLifecycle(inheritedEffectiveLifecycle);
    if ('ilm' in inheritedBaseline) {
      const found = ilmPolicies.find((p) => p.name === inheritedBaseline.ilm.policy);
      if (!found?.serializedPolicy) {
        return { action: 'clear' };
      }
    }

    return previewFromLifecycle({
      lifecycle: inheritedEffectiveLifecycle,
      ilmPolicies,
      isServerless,
      ilmPhases,
      hotColor,
      indexMode,
    });
  }

  if (method === 'ilm') {
    if (inspectedIlmPolicyName && selectedIlmPolicyName === selectedIlmPolicyNameAtInspect) {
      const inspected = ilmPolicies.find((p) => p.name === inspectedIlmPolicyName);
      if (!inspected?.serializedPolicy) {
        return { action: 'clear' };
      }

      return {
        ...previewFromSerializedIlmPolicy({
          policy: inspected.serializedPolicy,
          ilmPhases,
          indexMode,
        }),
        suppressUnsavedChanges: true,
      };
    }

    const selected = selectedIlmPolicyName
      ? ilmPolicies.find((p) => p.name === selectedIlmPolicyName)
      : undefined;
    if (selectedIlmPolicyName && !selected?.serializedPolicy) {
      return { action: 'clear' };
    }
    if (selected?.serializedPolicy) {
      return previewFromSerializedIlmPolicy({
        policy: selected.serializedPolicy,
        ilmPhases,
        indexMode,
      });
    }
  }

  return previewForDlmSelection({
    effectiveLifecycle,
    isServerless,
    ilmPhases,
    hotColor,
    indexMode,
  });
};
