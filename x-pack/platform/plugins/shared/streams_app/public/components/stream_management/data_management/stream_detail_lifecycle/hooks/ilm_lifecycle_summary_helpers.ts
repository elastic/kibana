/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { IlmPolicyPhases, IlmPolicyWithUsage, PhaseName } from '@kbn/streams-schema';
import type { DataStreamStats } from './use_data_stream_stats';
import type { LifecyclePhase } from '../common/data_lifecycle/lifecycle_types';
import type { AffectedResource } from '../downsampling/edit_policy_modal/edit_policy_modal';
import { formatBytes } from '../helpers/format_bytes';
import { getILMRatios } from '../helpers/helpers';
import { ILM_PHASE_ORDER } from '../downsampling/edit_ilm_phases_flyout/constants';

type IlmPhaseUiMeta = Record<PhaseName, { color: string; description: string }>;

export const buildAffectedResources = (
  policy: IlmPolicyWithUsage,
  currentStreamName: string
): AffectedResource[] => {
  const streams = (policy.in_use_by?.data_streams ?? []).filter(
    (streamName) => streamName !== currentStreamName
  );
  const indices = policy.in_use_by?.indices ?? [];

  return [
    ...streams.map((streamName) => ({ name: streamName, type: 'stream' as const })),
    ...indices.map((indexName) => ({ name: indexName, type: 'index' as const })),
  ];
};

export const getSelectedIlmPhases = ({
  isEditLifecycleFlyoutOpen,
  previewPhases,
  editFlyoutInitialPhases,
  ilmStatsPhases,
}: {
  isEditLifecycleFlyoutOpen: boolean;
  previewPhases: IlmPolicyPhases | null;
  editFlyoutInitialPhases: IlmPolicyPhases | null;
  ilmStatsPhases?: IlmPolicyPhases;
}): PhaseName[] => {
  const effectivePhases = isEditLifecycleFlyoutOpen
    ? previewPhases ?? editFlyoutInitialPhases
    : ilmStatsPhases;

  if (!effectivePhases) {
    return [];
  }

  return ILM_PHASE_ORDER.filter((phaseName) => effectivePhases?.[phaseName]);
};

export const buildLifecycleSummaryPhases = ({
  isEditLifecycleFlyoutOpen,
  previewPhases,
  ilmStatsPhases,
  stats,
  ilmPhases,
}: {
  isEditLifecycleFlyoutOpen: boolean;
  previewPhases: IlmPolicyPhases | null;
  ilmStatsPhases?: IlmPolicyPhases;
  stats?: DataStreamStats;
  ilmPhases: IlmPhaseUiMeta;
}): LifecyclePhase[] => {
  const summaryPhases = isEditLifecycleFlyoutOpen
    ? previewPhases ?? ilmStatsPhases
    : ilmStatsPhases;
  const phasesWithGrow = summaryPhases ? getILMRatios({ phases: summaryPhases }) : undefined;

  if (!phasesWithGrow) {
    return [];
  }

  const totalDocs = stats?.totalDocs || 0;
  const totalSize = phasesWithGrow.reduce(
    (sum, phase) => sum + ('size_in_bytes' in phase ? phase.size_in_bytes : 0),
    0
  );

  const nonDeletePhases = phasesWithGrow.filter((phase) => phase.name !== 'delete');
  const isLastNonDeletePhase = nonDeletePhases.length === 1;

  return phasesWithGrow.map((phase, index) => {
    const phaseSize = 'size_in_bytes' in phase ? phase.size_in_bytes : 0;
    const estimatedDocs =
      totalSize > 0 && totalDocs > 0 ? Math.round((phaseSize / totalSize) * totalDocs) : undefined;

    const hasReadonlyAction = 'readonly' in phase && phase.readonly === true;
    const searchableSnapshotAction =
      'searchable_snapshot' in phase ? phase.searchable_snapshot : undefined;

    const isRemoveDisabled = phase.name !== 'delete' && isLastNonDeletePhase;
    const removeDisabledReason = isRemoveDisabled
      ? i18n.translate('xpack.streams.lifecycleSummary.cannotRemoveLastPhase', {
          defaultMessage:
            'An ILM policy must have at least one phase (other than delete). This is the only remaining phase.',
        })
      : undefined;

    return {
      color: ilmPhases[phase.name].color,
      name: phase.name,
      label: phase.name,
      size: 'size_in_bytes' in phase ? formatBytes(phase.size_in_bytes) : undefined,
      grow: phase.grow,
      isDelete: phase.name === 'delete',
      timelineValue: phasesWithGrow[index + 1]?.min_age,
      description: ilmPhases[phase.name].description,
      sizeInBytes: 'size_in_bytes' in phase ? phase.size_in_bytes : undefined,
      docsCount: estimatedDocs,
      min_age: phase.min_age,
      isReadOnly: hasReadonlyAction,
      downsample: 'downsample' in phase ? phase.downsample : undefined,
      searchableSnapshot: searchableSnapshotAction,
      isRemoveDisabled,
      removeDisabledReason,
    };
  });
};
