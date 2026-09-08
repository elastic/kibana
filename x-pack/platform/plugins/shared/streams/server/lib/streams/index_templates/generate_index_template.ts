/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestStreamLifecycle } from '@kbn/streams-schema';
import { getAncestorsAndSelf, isDslLifecycle } from '@kbn/streams-schema';
import type { FailureStore } from '@kbn/streams-schema/src/models/ingest/failure_store';
import { ASSET_VERSION } from '../../../../common/constants';
import { failureStoreToIndexTemplateDataStreamOptions } from '../data_streams/manage_data_streams';
import {
  type FormattedIngestSettings,
  formattedIngestSettingsToTemplateIndexSettings,
} from '../state_management/streams/helpers';
import { getProcessingPipelineName } from '../ingest_pipelines/name';
import { getIndexTemplateName } from './name';

// Max java long value.
// We create the stream index template with the max priority possible
// to guarantee it will take precedence over existing templates overlapping
// with the index pattern.
export const MAX_PRIORITY = 9223372036854775807n;

export function generateIndexTemplate(
  name: string,
  lifecycle?: IngestStreamLifecycle,
  failureStore?: FailureStore,
  isServerless?: boolean,
  /** When the backing data stream is deferred, ingest settings must live on the template. */
  deferredFormattedIngestSettings?: FormattedIngestSettings
) {
  const composedOf = getAncestorsAndSelf(name).reduce((acc, ancestorName) => {
    return [...acc, `${ancestorName}@stream.layer`];
  }, [] as string[]);

  const dataStreamOptions =
    failureStore !== undefined && isServerless !== undefined
      ? failureStoreToIndexTemplateDataStreamOptions(failureStore, isServerless)
      : undefined;

  const deferredIndexSettings = deferredFormattedIngestSettings
    ? formattedIngestSettingsToTemplateIndexSettings(deferredFormattedIngestSettings)
    : {};

  return {
    name: getIndexTemplateName(name),
    index_patterns: [name],
    composed_of: composedOf,
    // max priority passed as a string so we don't lose precision
    priority: `${MAX_PRIORITY}` as unknown as number,
    version: ASSET_VERSION,
    _meta: {
      managed: true,
      description: `The index template for ${name} stream`,
      managed_by: 'streams',
    },
    data_stream: {
      hidden: false,
    },
    template: {
      settings: {
        index: {
          default_pipeline: getProcessingPipelineName(name),
          ...deferredIndexSettings,
        },
      },
      mappings: {
        properties: {
          'stream.name': {
            type: 'constant_keyword' as const,
            value: name,
          },
        },
      },
      ...(lifecycle && isDslLifecycle(lifecycle)
        ? {
            lifecycle: {
              ...(lifecycle.dsl.data_retention
                ? { data_retention: lifecycle.dsl.data_retention }
                : {}),
            },
          }
        : {}),
      ...(dataStreamOptions ? { data_stream_options: dataStreamOptions } : {}),
    },
    allow_auto_create: true,
    // ignore missing component templates to be more robust against out-of-order syncs
    ignore_missing_component_templates: composedOf,
  };
}
