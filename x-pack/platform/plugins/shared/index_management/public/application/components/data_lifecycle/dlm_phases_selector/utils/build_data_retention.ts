/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataRetention } from '../../../../../../common';
import { splitSizeAndUnits } from '../../../../../../common/lib/data_stream_utils';
import type { SerializedDlmPhases } from '../types';

export const buildDataRetentionFromSerializedDlmPhases = (
  serialized: SerializedDlmPhases
): DataRetention => {
  const { data_retention: dataRetention, frozen_after: frozenAfter } = serialized;

  if (!dataRetention && !frozenAfter) {
    return { enabled: false };
  }

  const next: DataRetention = { enabled: false };

  if (dataRetention) {
    const { size, unit } = splitSizeAndUnits(dataRetention);
    next.enabled = true;
    next.value = Number(size);
    next.unit = unit;
  }

  if (frozenAfter) {
    const { size, unit } = splitSizeAndUnits(frozenAfter);
    next.frozen = { enabled: true, value: Number(size), unit };
  }

  return next;
};
