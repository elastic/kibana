/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPolicyHotPhase, IlmPolicyPhases } from '@kbn/streams-schema';
import type { StreamsTimeUnit } from '../../../helpers/format_size_units';

export type TimeUnit = Extract<StreamsTimeUnit, 'd' | 'h' | 'm' | 's'>;
export type PreservedTimeUnit = StreamsTimeUnit;

export const DOWNSAMPLE_PHASES = ['hot', 'warm', 'cold'] as const;
export type DownsamplePhase = (typeof DOWNSAMPLE_PHASES)[number];

export interface MinAgeMetaFields {
  minAgeValue: string;
  /**
   * The UI only offers `d/h/m/s` by default, but ILM policies can contain other units (e.g. `ms`,
   * `micros`, `nanos`). We preserve and round-trip the unit as-is.
   */
  minAgeUnit: PreservedTimeUnit;
  /**
   * Derived field used for cross-phase min_age validation.
   * -1 means "unset / invalid / not computed".
   */
  minAgeToMilliSeconds: number;
}

export interface DownsampleMetaFields {
  fixedIntervalValue: string;
  /**
   * The UI only offers `d/h/m/s` by default, but ILM policies can contain other units (e.g. `ms`).
   * We preserve and round-trip the unit as-is.
   */
  fixedIntervalUnit: PreservedTimeUnit;
}

export interface HotPhaseMetaFields {
  enabled: boolean;
  sizeInBytes: number;
  rollover: IlmPolicyHotPhase['rollover'];
  readonlyEnabled: boolean;
  downsampleEnabled: boolean;
  downsample: DownsampleMetaFields;
}

export interface WarmPhaseMetaFields extends MinAgeMetaFields {
  enabled: boolean;
  sizeInBytes: number;
  readonlyEnabled: boolean;
  downsampleEnabled: boolean;
  downsample: DownsampleMetaFields;
}

export interface ColdPhaseMetaFields extends MinAgeMetaFields {
  enabled: boolean;
  sizeInBytes: number;
  readonlyEnabled: boolean;
  downsampleEnabled: boolean;
  downsample: DownsampleMetaFields;
  searchableSnapshotEnabled: boolean;
}

export interface FrozenPhaseMetaFields extends MinAgeMetaFields {
  enabled: boolean;
}

export interface DeletePhaseMetaFields extends MinAgeMetaFields {
  enabled: boolean;
  deleteSearchableSnapshotEnabled: boolean;
}

/**
 * All UI controls write to dedicated form paths under `_meta.*`.
 * Output `IlmPolicyPhases` is constructed solely by the serializer.
 */
export interface IlmPhasesFlyoutFormInternal {
  _meta: {
    hot: HotPhaseMetaFields;
    warm: WarmPhaseMetaFields;
    cold: ColdPhaseMetaFields;
    frozen: FrozenPhaseMetaFields;
    delete: DeletePhaseMetaFields;
    searchableSnapshot: {
      repository: string;
    };
  };
}

/**
 * Output/serialized shape for consumers.
 * This matches the existing component contract: `onChange(next: IlmPolicyPhases)`.
 */
export type IlmPhasesFlyoutFormOutput = IlmPolicyPhases;
