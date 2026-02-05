/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPolicyPhases } from '@kbn/streams-schema';

export interface EditIlmPhasesFlyoutProps {
  initialPhases: IlmPolicyPhases;
  onChange: (next: IlmPolicyPhases) => void;
  onSave: (next: IlmPolicyPhases) => void;
  onClose: () => void;
  isSaving?: boolean;
  canCreateRepository?: boolean;
  searchableSnapshotRepositories?: string[];
  isLoadingSearchableSnapshotRepositories?: boolean;
  onRefreshSearchableSnapshotRepositories?: () => void;
  onCreateSnapshotRepository?: () => void;
  'data-test-subj'?: string;
}
