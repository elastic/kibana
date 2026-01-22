/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Store } from '@kbn/canvas-plugin/public/lib/aeroelastic';

/**
 * Possible types of entries stored in the store.
 */
export enum StoreEntryType {
  toolResult = 'tool_result',
  attachment = 'attachment',
}

export interface StoreEntryMetadata<TExtraMeta extends object = {}> {
  /**
   * Type of the entry (tool_result, attachment...)
   */
  type: StoreEntryType;
  /**
   * Unique identifier of the entry, (unique for its type)
   */
  id: string;
  /**
   * Estimated length of the content of the entry.
   */
  content_length: number;
  /**
   * Defines if the entry can be modified or not.
   */
  readonly: boolean;
  /**
   * Extra per type metadata.
   */
  extra?: TExtraMeta;
}

export interface FileEntry<TContent extends object = object, TMeta extends object = object> {
  path: string;
  type: 'file';
  metadata: StoreEntryMetadata<TMeta>;
  content: TContent;
}

export interface DirEntry {
  path: string;
  type: 'dir';
}

export type StoreEntry = FileEntry | DirEntry;

// store-provider interface

export interface StoreManagement {
  addProvider(provider: StoreProvider): Promise<void>;
}

export interface StoreToProviderInterface {
  addEntry(entry: FileEntry);
  removeEntry(entry: FileEntry);
  // updateEntry(entry: FileEntry);
}

export interface StoreProvider {
  connect(controls: StoreToProviderInterface): Promise<void>;
}

const foo: StoreProvider = {
  connect: ({ addEntry, updateEntry, removeEntry }) => {},
};
