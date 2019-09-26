/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ShortcutMap {
  osx: string[];
  windows: string[];
  linux: string[];
  other: string[];
  help: string;
}

export interface ShortcutNameSpace {
  displayName: string;
  [shortcut: string]: string | ShortcutMap;
}
