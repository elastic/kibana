/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPolicyHotPhase, IlmPolicyPhases } from '@kbn/streams-schema';

export type TimeUnit = 'd' | 'h' | 'm' | 's';

export interface MinAgeMetaFields {
  minAgeValue: string;
  minAgeUnit: TimeUnit;
  /**
   * Derived field used for cross-phase min_age validation.
   * -1 means "unset / invalid / not computed".
   */
  minAgeToMilliSeconds: number;
}

export interface DownsampleMetaFields {
  fixedIntervalValue: string;
  fixedIntervalUnit: TimeUnit;
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
