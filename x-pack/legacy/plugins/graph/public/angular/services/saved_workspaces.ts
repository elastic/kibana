/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup, npStart } from 'ui/new_platform';
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import { i18n } from '@kbn/i18n';

import { createSavedWorkspaceClass } from './saved_workspace';

export function SavedWorkspacesProvider() {
  const savedObjectsClient = npStart.core.savedObjects.client;
  const services = {
    savedObjectsClient,
    indexPatterns: npStart.plugins.data.indexPatterns,
    chrome: npStart.core.chrome,
    overlays: npStart.core.overlays,
  };

  const SavedWorkspace = createSavedWorkspaceClass(services);
  const urlFor = (id: string) =>
    npSetup.core.http.basePath.prepend(`/app/graph#/workspace/${encodeURIComponent(id)}`);
  const mapHits = (hit: { id: string; attributes: Record<string, unknown> }) => {
    const source = hit.attributes;
    source.id = hit.id;
    source.url = urlFor(hit.id);
    source.icon = 'fa-share-alt'; // looks like a graph
    return source;
  };

  return {
    type: SavedWorkspace.type,
    Class: SavedWorkspace,
    loaderProperties: {
      name: 'Graph workspace',
      noun: i18n.translate('xpack.graph.savedWorkspaces.graphWorkspaceLabel', {
        defaultMessage: 'Graph workspace',
      }),
      nouns: i18n.translate('xpack.graph.savedWorkspaces.graphWorkspacesLabel', {
        defaultMessage: 'Graph workspaces',
      }),
    },
    // Returns a single dashboard by ID, should be the name of the workspace
    get: (id: string) => {
      // Returns a promise that contains a workspace which is a subclass of docSource
      // @ts-ignore
      return new SavedWorkspace(id).init();
    },
    urlFor,
    delete: (ids: string | string[]) => {
      const idArr = Array.isArray(ids) ? ids : [ids];
      return Promise.all(
        idArr.map((id: string) => savedObjectsClient.delete(SavedWorkspace.type, id))
      );
    },
    find: (searchString: string, size: number = 100) => {
      return savedObjectsClient
        .find({
          type: SavedWorkspace.type,
          search: searchString ? `${searchString}*` : undefined,
          perPage: size,
          searchFields: ['title^3', 'description'],
        })
        .then(resp => {
          return {
            total: resp.total,
            hits: resp.savedObjects.map(hit => mapHits(hit)),
          };
        });
    },
  };
}

SavedObjectRegistryProvider.register(SavedWorkspacesProvider);
