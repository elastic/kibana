/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { extractReferences, injectReferences } from './saved_workspace_references';
import {
  createSavedObjectClass,
  SavedObject,
  SavedObjectKibanaServices,
} from '../../legacy_imports';

export interface SavedWorkspace extends SavedObject {
  wsState?: string;
}

export function createSavedWorkspaceClass(services: SavedObjectKibanaServices) {
  // SavedWorkspace constructor. Usually you'd interact with an instance of this.
  // ID is option, without it one will be generated on save.
  const SavedObjectClass = createSavedObjectClass(services);
  class SavedWorkspaceClass extends SavedObjectClass {
    public static type: string = 'graph-workspace';
    // if type:workspace has no mapping, we push this mapping into ES
    public static mapping: Record<string, string> = {
      title: 'text',
      description: 'text',
      numLinks: 'integer',
      numVertices: 'integer',
      version: 'integer',
      wsState: 'json',
    };
    // Order these fields to the top, the rest are alphabetical
    public static fieldOrder = ['title', 'description'];
    public static searchSource = false;

    public wsState?: string;

    constructor(id: string) {
      // Gives our SavedWorkspace the properties of a SavedObject
      super({
        type: SavedWorkspaceClass.type,
        mapping: SavedWorkspaceClass.mapping,
        searchSource: SavedWorkspaceClass.searchSource,
        extractReferences,
        injectReferences,
        // if this is null/undefined then the SavedObject will be assigned the defaults
        id,
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
    }
    // Overwrite the default getDisplayName function which uses type and which is not very
    // user friendly for this object.
    getDisplayName = () => {
      return 'graph workspace';
    };
  }
  return SavedWorkspaceClass;
}
