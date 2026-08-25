/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlexItemProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { splitSizeAndUnits } from '@kbn/failure-store-modal/src/components/utils';
import type { DownsampleStep } from '@kbn/streams-schema/src/models/ingest/lifecycle';

/** Shared translated label for the frozen phase. Import this instead of calling i18n.translate inline. */
export const getFrozenPhaseLabel = () =>
  i18n.translate('xpack.streams.streamDetailLifecycle.frozen', { defaultMessage: 'Frozen' });

interface BaseLifecyclePhase {
  color: string;
  docsCount?: number;
  description?: string;
  downsample?: DownsampleStep;
  grow: EuiFlexItemProps['grow'];
  isReadOnly?: boolean;
  isRemoveDisabled?: boolean;
  removeDisabledReason?: string;
  label: string;
  min_age?: string;
  name: string;
  isFrozen?: boolean;
  searchableSnapshot?: string;
  sizeInBytes?: number;
  timelineValue?: string;
}

interface DeleteLifecyclePhase extends BaseLifecyclePhase {
  isDelete: true;
}

interface StandardLifecyclePhase extends BaseLifecyclePhase {
  isDelete?: false;
  size?: string;
}

export type LifecyclePhase = DeleteLifecyclePhase | StandardLifecyclePhase;

export function buildLifecyclePhases({
  docsCount,
  label,
  color,
  deletePhaseColor,
  deletePhaseDescription,
  frozenAfter,
  frozenLabel,
  frozenColor,
  frozenDescription,
  frozenSize,
  frozenSizeInBytes,
  frozenDocsCount,
  description,
  isReadOnly,
  retentionPeriod,
  size,
  sizeInBytes,
}: {
  color: string;
  docsCount?: number;
  deletePhaseColor: string;
  deletePhaseDescription?: string;
  frozenAfter?: string;
  frozenLabel?: string;
  frozenColor?: string;
  frozenDescription?: string;
  frozenSize?: string;
  frozenSizeInBytes?: number;
  frozenDocsCount?: number;
  description?: string;
  isReadOnly?: boolean;
  label: string;
  retentionPeriod?: string;
  size?: string;
  sizeInBytes?: number;
}): LifecyclePhase[] {
  // Extract unit from retentionPeriod for the zero phase or default to 'd'
  const { unit = 'd' } = retentionPeriod ? splitSizeAndUnits(retentionPeriod) : {};

  const phases: LifecyclePhase[] = [
    {
      name: label,
      color,
      label,
      size,
      grow: true,
      timelineValue: retentionPeriod,
      min_age: `0${unit}`,
      description,
      sizeInBytes,
      docsCount,
      isReadOnly,
    },
  ];

  // A configured frozen phase (including `0d`, i.e. "freeze immediately") is shown; an unconfigured
  // one is signalled by `frozenAfter === undefined`.
  if (frozenAfter !== undefined && frozenLabel !== undefined && frozenColor !== undefined) {
    phases.push({
      name: 'frozen',
      isFrozen: true,
      color: frozenColor,
      label: frozenLabel,
      grow: true,
      min_age: frozenAfter,
      description: frozenDescription,
      size: frozenSize,
      sizeInBytes: frozenSizeInBytes,
      docsCount: frozenDocsCount,
    });
  }

  // Only add delete phase if retention is not infinite
  if (retentionPeriod !== undefined) {
    phases.push({
      name: 'delete',
      label: 'delete',
      grow: false,
      isDelete: true,
      min_age: retentionPeriod,
      description: deletePhaseDescription,
      color: deletePhaseColor,
    });
  }

  return phases;
}
