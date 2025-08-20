/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Case } from '../../../../common';
import { BasePromptBuilder } from './case_summary_prompt_builder/base/base_prompt_builder';
import { ObservabilityPromptBuilder } from './case_summary_prompt_builder/obs/obs_prompt_builder';
import { SecurityPromptBuilder } from './case_summary_prompt_builder/sec/sec_prompt_builder';
import { StackPromptBuilder } from './case_summary_prompt_builder/stack/stack_prompt_builder';

export function getCaseSummaryPrompt(caseData: Case): string {
  switch (caseData.owner) {
    case 'observability':
      return new ObservabilityPromptBuilder(caseData).build();
    case 'security':
      return new SecurityPromptBuilder(caseData).build();
    case 'stack':
      return new StackPromptBuilder(caseData).build();
    default:
      return new BasePromptBuilder(caseData).build();
  }
}
