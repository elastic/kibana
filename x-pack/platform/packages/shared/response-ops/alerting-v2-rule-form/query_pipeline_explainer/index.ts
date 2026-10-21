/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { QueryPipelineExplainer } from './query_pipeline_explainer';
export type { QueryPipelineExplainerProps } from './query_pipeline_explainer';
export { AssembledQueriesControl } from './assembled_queries_control';
export { HighlightedEsqlBlock } from './highlighted_esql_block';
export {
  buildPipelineSteps,
  isComplexEsql,
  splitQueryForHighlight,
  NO_DATA_COMPLEX_LINE_THRESHOLD,
  NO_DATA_COMPLEX_CHAR_THRESHOLD,
} from './build_pipeline_steps';
export type { PipelineStep, PipelineStepId } from './build_pipeline_steps';
export { PipelineMap } from './pipeline_map';
export {
  DEMO_QUERY,
  DEMO_RECOVERY,
  DEMO_NO_DATA,
  DEMO_BASE_QUERY,
  DEMO_BREACH_SEGMENT,
  DEMO_RECOVERY_SEGMENT,
  DEMO_SHAPE_HIGHLIGHT_SEGMENT,
} from './demo_queries';
