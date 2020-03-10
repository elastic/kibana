/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IBasePath, SavedObjectsClientContract } from 'kibana/public';

const savedWorkspaceType = 'graph-workspace';

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
