/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GitCmd } from './git_cmd';

export class CatFile extends GitCmd {
  constructor(readonly repo: string) {
    super(repo);
  }

  public async getBlob(id: string) {
    return await this.git.raw(['cat-file', 'blob', id]);
  }
}
