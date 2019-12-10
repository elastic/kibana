/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { npSetup, npStart } from 'ui/new_platform';
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import { i18n } from '@kbn/i18n';

import { createSavedWorkspaceClass } from './saved_workspace';

export function SavedWorkspacesProvider() {
  const savedObjectsClient = npStart.core.savedObjects.client;
  const indexPatterns = npStart.plugins.data.indexPatterns;

  const SavedWorkspace = createSavedWorkspaceClass(savedObjectsClient, indexPatterns);

  this.type = SavedWorkspace.type;
  this.Class = SavedWorkspace;

  this.loaderProperties = {
    name: 'Graph workspace',
    noun: i18n.translate('xpack.graph.savedWorkspaces.graphWorkspaceLabel', {
      defaultMessage: 'Graph workspace',
    }),
    nouns: i18n.translate('xpack.graph.savedWorkspaces.graphWorkspacesLabel', {
      defaultMessage: 'Graph workspaces',
    }),
  };

  // Returns a single dashboard by ID, should be the name of the workspace
  this.get = function(id) {
    // Returns a promise that contains a workspace which is a subclass of docSource
    return new SavedWorkspace(id).init();
  };

  this.urlFor = id =>
    npSetup.core.http.basePath.prepend(`/app/graph#/workspace/${encodeURIComponent(id)}`);

  this.delete = function(ids) {
    ids = !_.isArray(ids) ? [ids] : ids;
    return Promise.all(ids.map(id => new SavedWorkspace(id).delete()));
  };

  this.mapHits = function(hit) {
    const source = hit.attributes;
    source.id = hit.id;
    source.url = this.urlFor(hit.id);
    source.icon = 'fa-share-alt'; // looks like a graph
    return source;
  };

  this.find = function(searchString, size = 100) {
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
          hits: resp.savedObjects.map(hit => this.mapHits(hit)),
        };
      });
  };
}

SavedObjectRegistryProvider.register(SavedWorkspacesProvider);
