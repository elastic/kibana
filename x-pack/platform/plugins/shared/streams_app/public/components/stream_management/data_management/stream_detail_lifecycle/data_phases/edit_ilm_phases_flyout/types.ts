/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPolicyPhases } from '@kbn/streams-schema';
import type { DataPhasesFlyoutCommonProps, EditDataPhasesFlyoutChangeMeta } from '../shared';

export interface EditIlmPhasesFlyoutProps extends DataPhasesFlyoutCommonProps {
  initialPhases: IlmPolicyPhases;
  isMetricsStream: boolean;

  canCreateRepository?: boolean;
  searchableSnapshotRepositories?: string[];
  isLoadingSearchableSnapshotRepositories?: boolean;
  onRefreshSearchableSnapshotRepositories?: () => void;
  onCreateSnapshotRepository?: () => void;

  onChange: (next: IlmPolicyPhases, meta: EditDataPhasesFlyoutChangeMeta) => void;
  onSave: (next: IlmPolicyPhases) => void;
}
