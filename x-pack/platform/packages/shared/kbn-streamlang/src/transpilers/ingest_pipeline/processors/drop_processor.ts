/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer, Script } from '@elastic/elasticsearch/lib/api/types';
import type { IngestPipelineDropProcessor } from '../../../../types/processors/ingest_pipeline_processors';

export const processDropProcessor = (
  dropProcessor: IngestPipelineDropProcessor
): IngestProcessorContainer[] => [
  {
    drop: { ...dropProcessor, if: dropProcessor.if as Script },
  },
];
