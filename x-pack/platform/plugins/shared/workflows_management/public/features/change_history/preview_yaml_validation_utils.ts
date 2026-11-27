/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemasSettings } from 'monaco-yaml';
import { monaco } from '@kbn/code-editor';

export const getYamlOwnerMarkersFingerprint = (model: monaco.editor.ITextModel): string => {
  const modelUri = model.uri.toString();
  let markers = monaco.editor.getModelMarkers({ resource: model.uri, owner: 'yaml' });

  if (markers.length === 0) {
    markers = monaco.editor
      .getModelMarkers({ owner: 'yaml' })
      .filter((marker) => marker.resource.toString() === modelUri);
  }

  return markers
    .map(
      (marker) =>
        `${marker.startLineNumber}:${marker.startColumn}:${marker.endLineNumber}:${marker.endColumn}:${marker.severity}:${marker.message}`
    )
    .sort()
    .join('\n');
};

export const modelHasYamlOwnerMarkers = (model: monaco.editor.ITextModel): boolean =>
  getYamlOwnerMarkersFingerprint(model).length > 0;

/** Fingerprint schema registration by uri so body-only changes do not force re-register. */
export const getPreviewSchemasFingerprint = (schemas: SchemasSettings[]): string =>
  schemas
    .map((schema) => schema.uri)
    .filter((uri): uri is string => Boolean(uri))
    .sort()
    .join('\n');
