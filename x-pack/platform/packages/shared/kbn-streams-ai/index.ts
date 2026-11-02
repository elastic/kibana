/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { generateStreamDescription } from './src/description/generate_description';
export { overviewDescriptionPrompt } from './src/description/prompt';
export { partitionStream } from './workflows/partition_stream';
export {
  suggestProcessingPipeline,
  mergeSeedParsingProcessorIntoSuggestedPipeline,
  buildDocumentStructureOverviewForPipelinePrompt,
  formatUpstreamSeedParsingContextForPromptMarkdown,
  fetchMappedFieldsForStreamProcessingSuggestions,
  getPipelineDefinitionJsonSchema,
  pipelineDefinitionSchema,
  postParsePipelineDefinitionSchema,
  formatZodPipelineErrors,
  buildSimulationFeedback,
  detectTemporaryFields,
  type SuggestProcessingPipelineResult,
  type SuggestPipelineAgentSchema,
  type SimulationFeedback,
} from './workflows/suggest_processing_pipeline';
