/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RetentionOption } from '@kbn/data-lifecycle-phases';
import type { ImportLifecycleMethod } from './constants';

export interface ImportLifecycleOption extends RetentionOption {
  method: ImportLifecycleMethod;
  hasDownsampling?: boolean;
}

export interface ImportLifecycleFlyoutProps {
  titleId: string;
  options: ImportLifecycleOption[];
  selectedOptionName?: string;
  onSelectOption: (name: string) => void;
  onInspect: (name: string) => void;
  isLoadingStreams: boolean;
  selectedMethods: ImportLifecycleMethod[];
  onChangeSelectedMethods: (methods: ImportLifecycleMethod[]) => void;
  onApply: () => void;
  onClose: () => void;
  isApplyDisabled: boolean;
  canUseDownsampling?: boolean;
  'data-test-subj'?: string;
}
