/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type {
  DreamingKiStepDependencies,
  DreamingStepDependencies,
  FeedbackAnalysisStepDependencies,
  ResearchStepDependencies,
} from './helpers';
import type { VerifyKi } from './verify_ki';
import { getCreateKiStepDefinition } from './create_ki';
import { getUpdateKiStepDefinition } from './update_ki';
import { getDeleteKiStepDefinition } from './delete_ki';
import { getFeedbackContextStepDefinition } from './feedback_context';
import { getRecordImprovementsStepDefinition } from './record_improvements';
import { getApplyDreamChangesStepDefinition } from './apply_dream_changes';
import { getApplyDreamRelationshipsStepDefinition } from './apply_dream_relationships';
import { getDreamingStatusStepDefinition } from './get_dreaming_status';
import { getReadTraceTranscriptsStepDefinition } from './read_trace_transcripts';
import {
  getListResearchSourcesStepDefinition,
  getSearchResearchSourcesStepDefinition,
} from './research_steps';
import {
  getApplyEnrichmentStepDefinition,
  getReadKisStepDefinition,
  getSelectEnrichmentCandidatesStepDefinition,
} from './enrichment_steps';
import { getApplyWikiPageStepDefinition, getGatherWikiPageStepDefinition } from './wiki_steps';

/** Registers the KI, feedback analysis, dreaming, enrichment and wiki workflow steps. */
export const registerStepDefinitions = ({
  workflowsExtensions,
  feedbackAnalysis,
  dreaming,
  research,
  verifyKi,
  ...deps
}: DreamingKiStepDependencies & {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  feedbackAnalysis: FeedbackAnalysisStepDependencies;
  dreaming: DreamingStepDependencies;
  research: ResearchStepDependencies;
  verifyKi: VerifyKi;
}): void => {
  workflowsExtensions.registerStepDefinition(getCreateKiStepDefinition({ ...deps, verifyKi }));
  workflowsExtensions.registerStepDefinition(getUpdateKiStepDefinition(deps));
  workflowsExtensions.registerStepDefinition(getDeleteKiStepDefinition(deps));
  workflowsExtensions.registerStepDefinition(getFeedbackContextStepDefinition(feedbackAnalysis));
  workflowsExtensions.registerStepDefinition(getRecordImprovementsStepDefinition(feedbackAnalysis));
  workflowsExtensions.registerStepDefinition(getDreamingStatusStepDefinition(dreaming));
  workflowsExtensions.registerStepDefinition(getReadTraceTranscriptsStepDefinition(dreaming));
  workflowsExtensions.registerStepDefinition(getApplyDreamChangesStepDefinition(deps));
  workflowsExtensions.registerStepDefinition(getApplyDreamRelationshipsStepDefinition(deps));
  workflowsExtensions.registerStepDefinition(getListResearchSourcesStepDefinition(research));
  workflowsExtensions.registerStepDefinition(getSearchResearchSourcesStepDefinition(research));
  workflowsExtensions.registerStepDefinition(getReadKisStepDefinition(research));
  workflowsExtensions.registerStepDefinition(getSelectEnrichmentCandidatesStepDefinition(research));
  workflowsExtensions.registerStepDefinition(getApplyEnrichmentStepDefinition(research));
  workflowsExtensions.registerStepDefinition(getGatherWikiPageStepDefinition(research));
  workflowsExtensions.registerStepDefinition(getApplyWikiPageStepDefinition(research));
};
