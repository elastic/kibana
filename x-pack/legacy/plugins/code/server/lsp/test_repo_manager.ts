/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import del from 'del';

import { TestConfig, Repo } from '../../model/test_config';
import { prepareProjectByCloning } from '../test_utils';

export class TestRepoManager {
  private repos: Repo[];

  constructor(testConfig: TestConfig) {
    this.repos = testConfig.repos;
  }

  public async importAllRepos() {
    for (const repo of this.repos) {
      await prepareProjectByCloning(repo.url, repo.path);
    }
  }

  public async cleanAllRepos() {
    for (const repo of this.repos) {
      await this.cleanRepo(repo.path);
    }
  }

  private async cleanRepo(path: string) {
    if (fs.existsSync(path)) {
      await del(path);
    }
  }

  public getRepo(language: string): Repo {
    return this.repos.filter(repo => {
      return repo.language === language;
    })[0];
  }
}
