/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCaseActivityPrompt } from './obs_case_activity_prompt';
import { CasePromptBuilder } from '../prompt_builder';

export class ObservabilityPromptBuilder extends CasePromptBuilder {
  protected getOpeningInstructions() {
    return `You are an expert Site Reliability Engineer (SRE) specialized in incident investigation.
  Create a structured summary of the following case for your fellow Site Reliability Engineers.`;
  }

  protected override getCaseDetails(): string {
    return [this.getCaseMetadata(), buildCaseActivityPrompt(this.caseData)].join('\n\n');
  }

  protected getAnalysisInstructions(): string {
    return `## Analysis Instructions\n
  Provide a concise summary in 3-4 sentences without any title that includes:\n
  1. The core issue or incident being reported\n
  2. The potential impact or severity level\n
  3. Any relevant patterns\n
  4. Any Synthetics monitors attached\n
  Apart from that, provide following numbers in bullet points: Alerts and SLOs, only if they are available in the format of <alerts_count> Alerts.\n
  Suggest next steps for investigation.\n\n
  Addiontial instructions: Focus on investigation related details and avoid referring to specific users.`;
  }
}
