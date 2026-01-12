/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IngestPipelineAppendProcessor,
  IngestPipelineDateProcessor,
  IngestPipelineDissectProcessor,
  IngestPipelineGrokProcessor,
  IngestPipelineManualIngestPipelineProcessor,
  IngestPipelineMathProcessor,
  IngestPipelineRenameProcessor,
  IngestPipelineSetProcessor,
  IngestPipelineConvertProcessor,
  IngestPipelineRemoveByPrefixProcessor,
  IngestPipelineRemoveProcessor,
  IngestPipelineDropProcessor,
  IngestPipelineReplaceProcessor,
  IngestPipelineUppercaseProcessor,
  IngestPipelineLowercaseProcessor,
  IngestPipelineTrimProcessor,
  IngestPipelineJoinProcessor,
} from '../../../../types/processors/ingest_pipeline_processors';

type WithOptionalTracingTag<T> = T & { tag?: string };

export interface ActionToIngestType {
  grok: WithOptionalTracingTag<IngestPipelineGrokProcessor>;
  dissect: WithOptionalTracingTag<IngestPipelineDissectProcessor>;
  date: WithOptionalTracingTag<IngestPipelineDateProcessor>;
  math: WithOptionalTracingTag<IngestPipelineMathProcessor>;
  rename: WithOptionalTracingTag<IngestPipelineRenameProcessor>;
  set: WithOptionalTracingTag<IngestPipelineSetProcessor>;
  append: WithOptionalTracingTag<IngestPipelineAppendProcessor>;
  convert: WithOptionalTracingTag<IngestPipelineConvertProcessor>;
  remove_by_prefix: WithOptionalTracingTag<IngestPipelineRemoveByPrefixProcessor>;
  remove: WithOptionalTracingTag<IngestPipelineRemoveProcessor>;
  drop_document: WithOptionalTracingTag<IngestPipelineDropProcessor>;
  uppercase: WithOptionalTracingTag<IngestPipelineUppercaseProcessor>;
  lowercase: WithOptionalTracingTag<IngestPipelineLowercaseProcessor>;
  trim: WithOptionalTracingTag<IngestPipelineTrimProcessor>;
  join: WithOptionalTracingTag<IngestPipelineJoinProcessor>;
  replace: WithOptionalTracingTag<IngestPipelineReplaceProcessor>;
  manual_ingest_pipeline: WithOptionalTracingTag<IngestPipelineManualIngestPipelineProcessor>;
}
