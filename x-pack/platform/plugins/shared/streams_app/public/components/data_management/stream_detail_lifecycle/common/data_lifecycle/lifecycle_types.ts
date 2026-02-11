/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlexItemProps } from '@elastic/eui';
import { splitSizeAndUnits } from '@kbn/failure-store-modal/src/components/utils';
import type { DownsampleStep } from '@kbn/streams-schema/src/models/ingest/lifecycle';

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
