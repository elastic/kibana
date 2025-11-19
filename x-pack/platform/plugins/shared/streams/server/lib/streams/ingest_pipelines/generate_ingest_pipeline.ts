/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams, getParentId, isRoot } from '@kbn/streams-schema';
import type { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import { transpileIngestPipeline } from '@kbn/streamlang';
import { ASSET_VERSION } from '../../../../common/constants';
import { getLogsDefaultPipelineProcessors } from './logs_default_pipeline';
import { getProcessingPipelineName } from './name';

/**
 * Generates processors to transform flattened geo_point fields (field.lat, field.lon)
 * into proper geo_point objects { lat: ..., lon: ... }
 */
export function generateGeoPointTransformProcessors(fields: Array<{ name: string; type: string }>) {
  // Filter to only geo_point fields
  const geoPointFields = fields
    .filter((field) => field.type === 'geo_point')
    .map((field) => field.name);

  if (geoPointFields.length === 0) {
    return [];
  }

  const processors: Array<Record<string, any>> = [];

  geoPointFields.forEach((fieldPath) => {
    // Script processor to handle multiple geo_point formats:
    // 1. Flattened: field.lat and field.lon exist
    // 2. Object: field is already {lat: ..., lon: ...}
    // 3. String: field is already a WKT string or other geo_point format
    processors.push({
      script: {
        source: `
          def latField = "${fieldPath}.lat";
          def lonField = "${fieldPath}.lon";
          def baseField = "${fieldPath}";
          
          // Use $() to safely fetch values, returns null if field doesn't exist
          def baseValue = $(baseField, null);
          def latValue = $(latField, null);
          def lonValue = $(lonField, null);
          
          // Case 1: Field is already a string (WKT or other format)
          if (baseValue instanceof String) {
            // Move to temp field for subsequent rename step
            ctx["_tmp_${fieldPath}"] = baseValue;
            return;
          }
          
          // Case 2: Field is a Map/Object with lat/lon
          if (baseValue instanceof Map) {
            def lat = baseValue.get('lat');
            def lon = baseValue.get('lon');
            if (lat != null && lon != null) {
              // Convert to WKT format
              ctx["_tmp_${fieldPath}"] = "POINT(" + lon + " " + lat + ")";
              return;
            }
          }
          
          // Case 3: Flattened format - lat and lon exist as separate fields
          if (latValue != null && lonValue != null) {
            // Create the geo_point object using the WKT notation
            ctx["_tmp_${fieldPath}"] = "POINT(" + lonValue + " " + latValue + ")";
          }
        `,
        lang: 'painless',
        description: `Transform ${fieldPath} into geo_point WKT format`,
      },
    });

    // Remove the .lat and .lon fields after transformation
    processors.push({
      remove: {
        field: [`${fieldPath}.lat`, `${fieldPath}.lon`, fieldPath],
        ignore_missing: true,
      },
    });

    // Rename the temporary field to the actual field name
    processors.push({
      rename: {
        field: `_tmp_${fieldPath}`,
        target_field: fieldPath,
        ignore_missing: true,
      },
    });
  });

  return processors;
}

export function generateIngestPipeline(
  name: string,
  definition: Streams.all.Definition
): IngestPutPipelineRequest {
  const isWiredStream = Streams.WiredStream.Definition.is(definition);
  return {
    id: getProcessingPipelineName(name),
    processors: [
      ...(isRoot(definition.name) ? getLogsDefaultPipelineProcessors() : []),
      ...(!isRoot(definition.name) && isWiredStream
        ? [
            {
              script: {
                source: `
                  if (ctx["stream.name"] != params.parentName) {
                    throw new IllegalArgumentException('stream.name is not set properly - did you send the document directly to a child stream instead of the main logs stream?');
                  }
                `,
                lang: 'painless',
                params: {
                  parentName: getParentId(definition.name),
                },
              },
            },
          ]
        : []),
      {
        script: {
          source: 'ctx["stream.name"] = params.field',
          lang: 'painless',
          params: {
            field: definition.name,
          },
        },
      },
      ...(isWiredStream ? transpileIngestPipeline(definition.ingest.processing).processors : []),
      // Add geo_point transformation processors for wired streams (after regular processing)
      ...(isWiredStream
        ? generateGeoPointTransformProcessors(
            Object.entries(definition.ingest.wired.fields).map(([fieldName, field]) => ({
              name: fieldName,
              type: field.type,
            }))
          )
        : []),
      {
        pipeline: {
          name: `${name}@stream.reroutes`,
          ignore_missing_pipeline: true,
        },
      },
    ],
    // root doesn't need flexible access pattern because it can't contain custom processing and default special case processing doesn't work properly with it
    ...(!isRoot(definition.name)
      ? {
          field_access_pattern: 'flexible',
        }
      : {}),
    _meta: {
      description: `Default pipeline for the ${name} stream`,
      managed: true,
    },
    version: ASSET_VERSION,
  };
}

export function generateClassicIngestPipelineBody(
  definition: Streams.ingest.all.Definition
): Partial<IngestPutPipelineRequest> {
  const transpiledIngestPipeline = transpileIngestPipeline(definition.ingest.processing);
  return {
    processors: transpiledIngestPipeline.processors,
    _meta: {
      description: `Stream-managed pipeline for the ${definition.name} stream`,
      managed: true,
    },
    // @ts-expect-error @elastic/elasticsearch field - missing in types
    field_access_pattern: 'flexible',
    version: ASSET_VERSION,
  };
}
