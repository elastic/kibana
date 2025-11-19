/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IngestProcessorContainer,
  IngestScriptProcessor,
} from '@elastic/elasticsearch/lib/api/types';
import type { IngestPipelineGeoipProcessor } from '../../../../types/processors/ingest_pipeline_processors';

export const processGeoipProcessor = (
  geoipProcessor: IngestPipelineGeoipProcessor
): IngestProcessorContainer[] => {
  const {
    target_field: targetField = 'geoip',
    description,
    ignore_failure: ignoreFailure,
  } = geoipProcessor;

  // Type assertion to handle optional fields that may exist at runtime but aren't in the type
  const processorWithOptionalFields = geoipProcessor as IngestPipelineGeoipProcessor & {
    tag?: string;
    on_failure?: IngestProcessorContainer[];
  };

  const processors: IngestProcessorContainer[] = [];

  // Create a clean geoip processor object without custom fields
  const { if: condition, ...geoipProcessorClean } = geoipProcessor;

  // First, add the standard geoip processor
  const geoipProcessorConfig: IngestProcessorContainer = {
    geoip: { ...geoipProcessorClean },
  };
  processors.push(geoipProcessorConfig);

  // Then, add a script processor to flatten the geoip output
  // The script gets the geoip object and flattens all its properties
  const flattenScript = `
def geoipData = $('${targetField}', null);
if (geoipData instanceof Map) {
  for (entry in geoipData.entrySet()) {
    ctx['${targetField}' + '.' + entry.getKey()] = entry.getValue();
  }
}
`.trim();

  const scriptProcessor: IngestScriptProcessor = {
    source: flattenScript,
    lang: 'painless',
  };

  if (description) {
    scriptProcessor.description = `Flatten ${targetField} properties`;
  }

  if (ignoreFailure) {
    scriptProcessor.ignore_failure = ignoreFailure;
  }

  if (processorWithOptionalFields.tag) {
    scriptProcessor.tag = `${processorWithOptionalFields.tag}_flatten`;
  }

  if (processorWithOptionalFields.on_failure) {
    scriptProcessor.on_failure = processorWithOptionalFields.on_failure;
  }

  processors.push({
    script: scriptProcessor,
  });

  // Finally, add a remove processor to delete the original target field object
  // to avoid duplication (we have the flattened fields now)
  processors.push({
    remove: {
      field: targetField,
      ignore_missing: true,
      ignore_failure: true,
    },
  });

  return processors;
};
