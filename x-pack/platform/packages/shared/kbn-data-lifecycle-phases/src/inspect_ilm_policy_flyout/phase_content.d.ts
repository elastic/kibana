/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type {
  Phases,
  ShrinkAction,
  ForcemergeAction,
  SearchableSnapshotAction,
  SetPriorityAction,
  AllocateAction,
  MigrateAction,
  DownsampleAction,
} from '@kbn/index-lifecycle-management-common-shared';
import type { IlmPhase } from '../phases';
export interface Row {
  label: string;
  value: ReactNode;
}
export interface Section {
  section?: string;
  rows: Row[];
}
export declare const shrinkSection: (shrink: ShrinkAction) => Section;
export declare const forcemergeSection: (fm: ForcemergeAction) => Section;
export declare const snapshotSection: (snap: SearchableSnapshotAction) => Section;
export declare const prioritySection: (sp: SetPriorityAction) => Section;
export declare const replicasSection: (allocate: AllocateAction) => Section;
export declare const customAllocationSection: (allocate: AllocateAction) => Section | null;
export declare const downsampleSection: (ds: DownsampleAction) => Section;
export declare const dataAllocationSection: (label: string) => Section;
export declare const readOnlySection: () => Section;
export declare const getAllocationLabel: (
  migrate: MigrateAction | undefined,
  phase: 'warm' | 'cold'
) => string;
export declare const buildPhaseContent: (phase: IlmPhase, phases: Phases) => Section[];
