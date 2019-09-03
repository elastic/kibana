/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject } from 'ui/saved_objects/saved_object';

/**
 * Workspace fetched from server.
 * This type is returned by `SavedWorkspacesProvider#get`.
 */
export interface SavedGraphWorkspace extends SavedObject {
  title: string;
  description: string;
  numLinks: number;
  numVertices: number;
  version: number;
  wsState: string;
}
