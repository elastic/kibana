/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestStreamLifecycleDSL } from '@kbn/streams-schema';

export interface EditDslStepsFlyoutProps {
  initialSteps: IngestStreamLifecycleDSL;
  selectedStepIndex: number | undefined;
  setSelectedStepIndex: (index: number | undefined) => void;
  onChange: (next: IngestStreamLifecycleDSL) => void;
  onSave: (next: IngestStreamLifecycleDSL) => void;
  onClose: () => void;
  onChangeDebounceMs?: number;
  isSaving?: boolean;
  'data-test-subj'?: string;
}
