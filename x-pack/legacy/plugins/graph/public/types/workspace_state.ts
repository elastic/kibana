/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FontawesomeIcon } from '../services/style_choices';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JsonArray extends Array<JsonValue> {}

type JsonValue = null | boolean | number | string | JsonObject | JsonArray;

interface JsonObject {
  [key: string]: JsonValue;
}

export interface WorkspaceNode {
  label: string;
  icon: FontawesomeIcon;
}

export interface Workspace {
  getQuery(startNodes?: WorkspaceNode[], loose?: boolean): JsonObject;
  getSelectedOrAllNodes(): WorkspaceNode[];
  getLikeThisButNotThisQuery(startNodes?: WorkspaceNode[]): JsonObject;
}
