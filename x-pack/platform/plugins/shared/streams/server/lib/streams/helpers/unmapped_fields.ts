/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFlattenedObject } from '@kbn/std';
import type { Streams } from '@kbn/streams-schema';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { collectFieldsWithGeoPoints } from './normalize_geo_points';

export const UNMAPPED_SAMPLE_SIZE = 500;

/**
 * Given a stream definition, its ancestors, and a set of sample documents,
 * returns the list of field names present in _source but not in any stream
 * mapping. Correctly excludes geo_point sub-fields (.lat / .lon).
 */
export const getUnmappedFields = ({
  definition,
  ancestors,
  sampleDocs,
}: {
  definition: Streams.all.Definition;
  ancestors: Streams.WiredStream.Definition[];
  sampleDocs: SearchResponse;
}): string[] => {
  const sourceFields = new Set<string>();
  for (const hit of sampleDocs.hits.hits) {
    for (const field of Object.keys(getFlattenedObject(hit._source as Record<string, unknown>))) {
      sourceFields.add(field);
    }
  }

  const mappedFields = new Set<string>();
  const geoPointFields = new Set<string>();

  if ('ingest' in definition && 'wired' in definition.ingest) {
    collectFieldsWithGeoPoints(
      (definition as Streams.WiredStream.Definition).ingest.wired.fields,
      mappedFields,
      geoPointFields
    );
  } else if ('ingest' in definition && 'classic' in definition.ingest) {
    collectFieldsWithGeoPoints(
      (definition as Streams.ClassicStream.Definition).ingest.classic.field_overrides || {},
      mappedFields,
      geoPointFields
    );
  }

  for (const ancestor of ancestors) {
    collectFieldsWithGeoPoints(ancestor.ingest.wired.fields, mappedFields, geoPointFields);
  }

  return Array.from(sourceFields)
    .filter((field) => {
      if (mappedFields.has(field)) return false;

      const latMatch = field.match(/^(.+)\.lat$/);
      const lonMatch = field.match(/^(.+)\.lon$/);

      if (latMatch && geoPointFields.has(latMatch[1])) return false;
      if (lonMatch && geoPointFields.has(lonMatch[1])) return false;

      return true;
    })
    .sort();
};
