/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GitCmd } from './git_cmd';

interface TreeItem {
  mode: string;
  type: string;
  id: string;
  path: string;
  size: number | undefined;
}

export interface LsTreeOptions {
  blobOnly?: boolean;
  withSize?: boolean;
  recursive?: boolean;
}

const ItemRegex = /(\d{6})\s(blob|tree|commit)\s([0-9a-f]{40})(\s+\d+)?\s+(.*)/g;

export class LsTree extends GitCmd {
  private _items: TreeItem[] | undefined = undefined;
  constructor(
    readonly repo: string,
    readonly ref: string,
    readonly path: string,
    readonly options: LsTreeOptions
  ) {
    super(repo);
  }

  public async count() {
    return (await this.items()).length;
  }

  public async items() {
    if (!this._items) {
      const options = [];
      if (this.options.recursive) {
        options.push('-r');
      }
      if (!this.options.blobOnly) {
        options.push('-t');
      }
      if (this.options.withSize) {
        options.push('-l');
      }
      const commands = ['ls-tree', ...options, this.ref];
      if (this.path) {
        commands.push(this.path);
      }
      const result = await this.git.raw(commands);

      this._items = [...result.matchAll(ItemRegex)].map(arr => {
        const [, mode, type, id, size, path] = arr;
        return {
          mode,
          type,
          id,
          path,
          size: size ? parseInt(size, 10) : undefined,
        };
      });
    }
    return this._items;
  }
}
