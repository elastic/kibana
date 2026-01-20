/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlexItemProps } from '@elastic/eui';
import { splitSizeAndUnits } from '@kbn/failure-store-modal/src/components/utils';
import type { DownsampleStep } from '@kbn/streams-schema/src/models/ingest/lifecycle';

export interface LifecyclePhase {
  name?: string;
  color?: string;
  label?: string;
  size?: string;
  grow: EuiFlexItemProps['grow'];
  isDelete?: boolean;
  timelineValue?: string;
  min_age?: string;
  colorHover?: string;
  description?: string;
  sizeInBytes?: number;
  docsCount?: number;
  isReadOnly?: boolean;
  downsample?: DownsampleStep;
  searchableSnapshot?: string;
}

export function buildLifecyclePhases({
  label,
  color,
  size,
  retentionPeriod,
  colorHover,
  description,
  sizeInBytes,
  docsCount,
  isReadOnly,
  deletePhaseDescription,
  deletePhaseColor,
  deletePhaseColorHover,
}: {
  label: string;
  color: string;
  size?: string;
  retentionPeriod?: string;
  colorHover?: string;
  description?: string;
  sizeInBytes?: number;
  docsCount?: number;
  isReadOnly?: boolean;
  deletePhaseDescription?: string;
  deletePhaseColor?: string;
  deletePhaseColorHover?: string;
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
      colorHover,
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
      colorHover: deletePhaseColorHover,
    });
  }

  return phases;
}
