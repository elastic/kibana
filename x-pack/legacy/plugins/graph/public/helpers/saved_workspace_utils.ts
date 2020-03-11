/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';
import { i18n } from '@kbn/i18n';
import { IBasePath, SavedObjectsClientContract } from 'kibana/public';

import { applyESRespTo } from '../../../../../../src/plugins/saved_objects/public';
import { injectReferences } from '../services/persistence/saved_workspace_references';
import { IndexPatternsContract } from '../../../../../../src/plugins/data/public';

const savedWorkspaceType = 'graph-workspace';
const mapping: Record<string, string> = {
  title: 'text',
  description: 'text',
  numLinks: 'integer',
  numVertices: 'integer',
  version: 'integer',
  wsState: 'json',
};
const defaults = {
  title: i18n.translate('xpack.graph.savedWorkspace.workspaceNameTitle', {
    defaultMessage: 'New Graph Workspace',
  }),
  numLinks: 0,
  numVertices: 0,
  wsState: '{}',
  version: 1,
};

const urlFor = (basePath: IBasePath, id: string) =>
  basePath.prepend(`/app/graph#/workspace/${encodeURIComponent(id)}`);

function mapHits(hit: { id: string; attributes: Record<string, unknown> }, url: string) {
  const source = hit.attributes;
  source.id = hit.id;
  source.url = url;
  source.icon = 'fa-share-alt'; // looks like a graph
  return source;
}

interface SavedWorkspaceServices {
  basePath: IBasePath;
  savedObjectsClient: SavedObjectsClientContract;
}

export function findSW(
  { savedObjectsClient, basePath }: SavedWorkspaceServices,
  searchString: string,
  size: number = 100
) {
  return savedObjectsClient
    .find<Record<string, unknown>>({
      type: savedWorkspaceType,
      search: searchString ? `${searchString}*` : undefined,
      perPage: size,
      searchFields: ['title^3', 'description'],
    })
    .then(resp => {
      return {
        total: resp.total,
        hits: resp.savedObjects.map(hit => mapHits(hit, urlFor(basePath, hit.id))),
      };
    });
}

export async function getSW(
  {
    savedObjectsClient,
    indexPatterns,
  }: { savedObjectsClient: SavedObjectsClientContract; indexPatterns: IndexPatternsContract },
  id: string
) {
  const resp = await savedObjectsClient.get(savedWorkspaceType, id);

  const respMapped = {
    _id: resp.id,
    _type: resp.type,
    _source: cloneDeep(resp.attributes),
    references: resp.references,
    found: !!resp._version,
  };

  const config = {
    id,
    mapping,
    type: savedWorkspaceType,
    injectReferences,
    defaults,
  };

  return await applyESRespTo(indexPatterns, respMapped, config);
}
