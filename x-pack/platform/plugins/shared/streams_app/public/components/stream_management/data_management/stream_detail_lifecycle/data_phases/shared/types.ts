/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PhaseName } from '@kbn/streams-schema';

export interface DataPhasesFlyoutCommonProps {
  selectedPhase: PhaseName | undefined;
  setSelectedPhase: (phase: PhaseName | undefined) => void;
  onClose: () => void;
  onChangeDebounceMs?: number;
  isSaving?: boolean;
  'data-test-subj'?: string;
}

export interface EditDataPhasesFlyoutChangeMeta {
  invalidPhases: PhaseName[];
}
