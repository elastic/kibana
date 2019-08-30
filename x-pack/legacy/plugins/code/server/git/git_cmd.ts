/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import simplegit from '@elastic/simple-git/promise';

export class GitCmd {
  protected readonly git: simplegit.SimpleGit;

  constructor(readonly repo: string) {
    this.git = simplegit(repo);
  }
}
