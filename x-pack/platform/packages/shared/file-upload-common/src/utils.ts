/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { IngestPipelineConfig } from '@elastic/elasticsearch/lib/api/types';
import type { IngestPipeline } from './types';

// The file structure endpoint sets the timezone to be {{ event.timezone }}
// as that's the variable Filebeat would send the client timezone in.
// In this data import function the UI is effectively performing the role of Filebeat,
// i.e. doing basic parsing, processing and conversion to JSON before forwarding to the ingest pipeline.
// But it's not sending every single field that Filebeat would add, so the ingest pipeline
// cannot look for a event.timezone variable in each input record.
// Therefore we need to replace {{ event.timezone }} with the actual browser timezone
export function updatePipelineTimezone(ingestPipeline: IngestPipeline | IngestPipelineConfig) {
  if (ingestPipeline !== undefined && ingestPipeline.processors && ingestPipeline.processors) {
    const dateProcessor = ingestPipeline.processors.find(
      (p: any) => p.date !== undefined && p.date.timezone === '{{ event.timezone }}'
    );

    if (dateProcessor) {
      dateProcessor.date.timezone = moment.tz.guess();
    }
  }
}
