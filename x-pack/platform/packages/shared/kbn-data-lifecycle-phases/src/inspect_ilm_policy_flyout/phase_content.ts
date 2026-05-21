/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type {
  Phases,
  RolloverAction,
  SerializedHotPhase,
  SerializedWarmPhase,
  SerializedColdPhase,
  SerializedFrozenPhase,
  SerializedDeletePhase,
  ShrinkAction,
  ForcemergeAction,
  SearchableSnapshotAction,
  SetPriorityAction,
  AllocateAction,
  MigrateAction,
  DownsampleAction,
} from '@kbn/index-lifecycle-management-common-shared';
import type { IlmPhase } from '../phases';
import { inspectIlmPolicyFlyoutStrings as strings } from './strings';

const enabledLabel = strings.enabledLabel;
const disabledLabel = strings.disabledLabel;

export interface Row {
  label: string;
  value: ReactNode;
}

export interface Section {
  section?: string;
  rows: Row[];
}

export const shrinkSection = (shrink: ShrinkAction): Section => ({
  section: strings.shrinkSection,
  rows: [
    {
      label: strings.shrinkBy,
      value: shrink.max_primary_shard_size ? strings.shrinkBySize : strings.shrinkByShardCount,
    },
    ...(shrink.max_primary_shard_size
      ? [
          {
            label: strings.primaryShardSize,
            value: shrink.max_primary_shard_size,
          },
        ]
      : []),
    ...(shrink.number_of_shards
      ? [
          {
            label: strings.primaryShardCount,
            value: shrink.number_of_shards,
          },
        ]
      : []),
    ...(shrink.allow_write_after_shrink !== undefined
      ? [
          {
            label: strings.writeAfterShrink,
            value: shrink.allow_write_after_shrink ? enabledLabel : disabledLabel,
          },
        ]
      : []),
  ],
});

export const forcemergeSection = (fm: ForcemergeAction): Section => ({
  section: strings.forcemergeSection,
  rows: [
    { label: strings.numberOfSegments, value: fm.max_num_segments },
    ...(fm.index_codec === 'best_compression'
      ? [{ label: strings.compressStoredField, value: enabledLabel }]
      : []),
  ],
});

export const snapshotSection = (snap: SearchableSnapshotAction): Section => ({
  section: strings.searchableSnapshotSection,
  rows: [
    { label: strings.repository, value: snap.snapshot_repository },
    ...(snap.force_merge_index !== undefined
      ? [
          {
            label: strings.forceMergeIndex,
            value: snap.force_merge_index ? enabledLabel : disabledLabel,
          },
        ]
      : []),
    ...(snap.force_merge_on_clone !== undefined
      ? [
          {
            label: strings.forceMergeOnClone,
            value: snap.force_merge_on_clone ? enabledLabel : disabledLabel,
          },
        ]
      : []),
  ],
});

export const prioritySection = (sp: SetPriorityAction): Section => ({
  section: strings.recoveryPrioritySection,
  rows: [
    {
      label: strings.indexPriority,
      value: sp.priority === null ? strings.indexPriorityDefault : sp.priority,
    },
  ],
});

export const replicasSection = (allocate: AllocateAction): Section => ({
  section: strings.replicasSection,
  rows: [
    ...(allocate.number_of_replicas !== undefined
      ? [
          {
            label: strings.numberOfReplicas,
            value: allocate.number_of_replicas,
          },
        ]
      : []),
  ],
});

const formatAttributes = (attrs: Record<string, string>): string =>
  Object.entries(attrs)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

export const customAllocationSection = (allocate: AllocateAction): Section | null => {
  const rows: Row[] = [];
  if (allocate.include && Object.keys(allocate.include).length > 0)
    rows.push({
      label: strings.allocateInclude,
      value: formatAttributes(allocate.include),
    });
  if (allocate.exclude && Object.keys(allocate.exclude).length > 0)
    rows.push({
      label: strings.allocateExclude,
      value: formatAttributes(allocate.exclude),
    });
  if (allocate.require && Object.keys(allocate.require).length > 0)
    rows.push({
      label: strings.allocateRequire,
      value: formatAttributes(allocate.require),
    });
  return rows.length > 0 ? { section: strings.nodeAttributesSection, rows } : null;
};

export const downsampleSection = (ds: DownsampleAction): Section => ({
  section: strings.downsampleSection,
  rows: [{ label: strings.downsampleFixedInterval, value: ds.fixed_interval }],
});

export const dataAllocationSection = (label: string): Section => ({
  section: strings.dataAllocationSection,
  rows: [{ label: strings.moveData, value: label }],
});

export const readOnlySection = (): Section => ({
  rows: [{ label: strings.readOnly, value: enabledLabel }],
});

const allocationSections = (
  allocate: AllocateAction | undefined,
  migrate: MigrateAction | undefined,
  phase: 'warm' | 'cold'
): Section[] => {
  const replicaSections =
    allocate && allocate.number_of_replicas !== undefined ? [replicasSection(allocate)] : [];
  const customAllocation = allocate ? customAllocationSection(allocate) : null;
  /**
   * Attribute-based allocation filters are custom/manual allocation rules. They are distinct from
   * ILM's automatic tier migration, so avoid showing the implicit "Use warm/cold nodes" default for
   * the same phase. If the policy explicitly defines `migrate`, show that setting as well.
   */
  const tierAllocationSections = customAllocation
    ? [
        customAllocation,
        ...(migrate ? [dataAllocationSection(getAllocationLabel(migrate, phase))] : []),
      ]
    : [dataAllocationSection(getAllocationLabel(migrate, phase))];

  return [...replicaSections, ...tierAllocationSections];
};

const ROLLOVER_SIZE_KEYS = new Set<keyof RolloverAction>([
  'max_primary_shard_size',
  'max_size',
  'min_primary_shard_size',
  'min_size',
]);

const formatRolloverThreshold = (key: keyof RolloverAction, value: string | number): string => {
  const formattedValue =
    typeof value === 'string' && ROLLOVER_SIZE_KEYS.has(key) ? value.toUpperCase() : value;

  return `≥ ${formattedValue}`;
};

const buildRolloverSections = (rollover: RolloverAction): Section[] => {
  const triggerRows: Row[] = [];
  const restrictRows: Row[] = [];

  const triggerSpecs: Array<{ key: keyof RolloverAction; label: string }> = [
    { key: 'max_age', label: strings.rolloverAge },
    {
      key: 'max_primary_shard_size',
      label: strings.rolloverPrimaryShardSize,
    },
    { key: 'max_size', label: strings.rolloverIndexSize },
    { key: 'max_docs', label: strings.rolloverDocs },
    {
      key: 'max_primary_shard_docs',
      label: strings.rolloverPrimaryShardDocs,
    },
  ];

  const restrictSpecs: Array<{ key: keyof RolloverAction; label: string }> = [
    { key: 'min_age', label: strings.rolloverAge },
    { key: 'min_docs', label: strings.rolloverDocs },
    {
      key: 'min_primary_shard_size',
      label: strings.rolloverPrimaryShardSize,
    },
    { key: 'min_size', label: strings.rolloverIndexSize },
    {
      key: 'min_primary_shard_docs',
      label: strings.rolloverPrimaryShardDocs,
    },
  ];

  for (const { key, label } of triggerSpecs) {
    const value = rollover[key];
    if (value !== undefined)
      triggerRows.push({ label, value: formatRolloverThreshold(key, value) });
  }

  for (const { key, label } of restrictSpecs) {
    const value = rollover[key];
    if (value !== undefined)
      restrictRows.push({ label, value: formatRolloverThreshold(key, value) });
  }

  return [
    ...(triggerRows.length > 0
      ? [
          {
            section: strings.rolloverTriggerSection,
            rows: triggerRows,
          },
        ]
      : []),
    ...(restrictRows.length > 0
      ? [
          {
            section: strings.rolloverRestrictSection,
            rows: restrictRows,
          },
        ]
      : []),
  ];
};

export const getAllocationLabel = (
  migrate: MigrateAction | undefined,
  phase: 'warm' | 'cold'
): string => {
  if (migrate?.enabled === false) return strings.noDataTierMigration;
  return phase === 'cold' ? strings.useColdNodes : strings.useWarmNodes;
};

const buildHotPhaseContent = (phases: Phases): Section[] => {
  const hot = phases.hot as SerializedHotPhase | undefined;
  if (!hot) return [];

  const {
    rollover,
    readonly,
    shrink,
    forcemerge,
    searchable_snapshot: snap,
    set_priority,
    downsample,
  } = hot.actions;

  const sections: Section[] = [];
  if (readonly !== undefined) sections.push(readOnlySection());
  if (rollover) {
    sections.push(...buildRolloverSections(rollover));
  }
  if (shrink) sections.push(shrinkSection(shrink));
  if (forcemerge) sections.push(forcemergeSection(forcemerge));
  if (downsample) sections.push(downsampleSection(downsample));
  if (snap) sections.push(snapshotSection(snap));
  if (set_priority) sections.push(prioritySection(set_priority));

  return sections;
};

const buildWarmPhaseContent = (phases: Phases): Section[] => {
  const warm = phases.warm as SerializedWarmPhase | undefined;
  if (!warm) return [];

  const { readonly, allocate, shrink, forcemerge, set_priority, migrate, downsample } =
    warm.actions;
  const sections: Section[] = [];

  if (readonly !== undefined) sections.push(readOnlySection());

  sections.push(...allocationSections(allocate, migrate, 'warm'));

  if (shrink) sections.push(shrinkSection(shrink));
  if (forcemerge) sections.push(forcemergeSection(forcemerge));
  if (downsample) sections.push(downsampleSection(downsample));

  if (set_priority) sections.push(prioritySection(set_priority));

  return sections;
};

const buildColdPhaseContent = (phases: Phases): Section[] => {
  const cold = phases.cold as SerializedColdPhase | undefined;
  if (!cold) return [];

  const {
    freeze,
    readonly,
    allocate,
    searchable_snapshot: snap,
    set_priority,
    migrate,
    downsample,
  } = cold.actions;
  const sections: Section[] = [];

  if (readonly !== undefined) sections.push(readOnlySection());

  if (freeze !== undefined)
    sections.push({ rows: [{ label: strings.freeze, value: enabledLabel }] });

  sections.push(...allocationSections(allocate, migrate, 'cold'));
  if (downsample) sections.push(downsampleSection(downsample));

  if (snap) sections.push(snapshotSection(snap));
  if (set_priority) sections.push(prioritySection(set_priority));

  return sections;
};

const buildFrozenPhaseContent = (phases: Phases): Section[] => {
  const frozen = phases.frozen as SerializedFrozenPhase | undefined;
  if (!frozen) return [];

  const sections: Section[] = [];
  const { searchable_snapshot: snap } = frozen.actions;
  if (snap) sections.push(snapshotSection(snap));

  return sections;
};

const buildDeletePhaseContent = (phases: Phases): Section[] => {
  const delPhase = phases.delete as SerializedDeletePhase | undefined;
  if (!delPhase) return [];

  const sections: Section[] = [];
  const { actions } = delPhase;

  if (actions.delete !== undefined) {
    sections.push({
      rows: [
        {
          label: strings.deleteSnapshot,
          value: actions.delete.delete_searchable_snapshot === false ? disabledLabel : enabledLabel,
        },
      ],
    });
  }

  if (actions.wait_for_snapshot) {
    sections.push({
      section: strings.waitForPolicySnapshotSection,
      rows: [
        {
          label: strings.policyName,
          value: actions.wait_for_snapshot.policy,
        },
      ],
    });
  }

  return sections;
};

export const buildPhaseContent = (phase: IlmPhase, phases: Phases): Section[] => {
  switch (phase) {
    case 'hot':
      return buildHotPhaseContent(phases);
    case 'warm':
      return buildWarmPhaseContent(phases);
    case 'cold':
      return buildColdPhaseContent(phases);
    case 'frozen':
      return buildFrozenPhaseContent(phases);
    case 'delete':
      return buildDeletePhaseContent(phases);
  }
};
