/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { listSourceMapsRoute } from './list_source_maps';
import { uploadSourceMapRoute } from './upload_source_map';
import { deleteSourceMapRoute } from './delete_source_map';
import { migrateFleetArtifactsRoute } from './migrate_fleet_artifacts';

export const sourceMapsRouteDefinitions = {
  list: listSourceMapsRoute,
  upload: uploadSourceMapRoute,
  delete: deleteSourceMapRoute,
  migrateFleetArtifacts: migrateFleetArtifactsRoute,
};

export { sourceMapSchema, type SourceMap, type ApmSourceMapArtifactBody } from './source_map_types';
export type { ListSourceMapArtifactsResponse } from './list_source_maps';
