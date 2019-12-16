/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectProvider } from 'ui/saved_objects/saved_object';
import { i18n } from '@kbn/i18n';
import { extractReferences, injectReferences } from './saved_workspace_references';

export function SavedWorkspaceProvider(Private) {
  // SavedWorkspace constructor. Usually you'd interact with an instance of this.
  // ID is option, without it one will be generated on save.
  const SavedObject = Private(SavedObjectProvider);
  class SavedWorkspace extends SavedObject {
    constructor(id) {
      // Gives our SavedWorkspace the properties of a SavedObject
      super({
        type: SavedWorkspace.type,
        mapping: SavedWorkspace.mapping,
        searchSource: SavedWorkspace.searchsource,
        extractReferences: extractReferences,
        injectReferences: injectReferences,

        // if this is null/undefined then the SavedObject will be assigned the defaults
        id: id,

        // default values that will get assigned if the doc is new
        defaults: {
          title: i18n.translate('xpack.graph.savedWorkspace.workspaceNameTitle', {
            defaultMessage: 'New Graph Workspace',
          }),
          numLinks: 0,
          numVertices: 0,
          wsState: '{}',
          version: 1,
        },
      });

      // Overwrite the default getDisplayName function which uses type and which is not very
      // user friendly for this object.
      this.getDisplayName = function() {
        return 'graph workspace';
      };
    }
  } //End of class

  SavedWorkspace.type = 'graph-workspace';

  // if type:workspace has no mapping, we push this mapping into ES
  SavedWorkspace.mapping = {
    title: 'text',
    description: 'text',
    numLinks: 'integer',
    numVertices: 'integer',
    version: 'integer',
    wsState: 'json',
  };

  SavedWorkspace.searchsource = false;
  return SavedWorkspace;
}
