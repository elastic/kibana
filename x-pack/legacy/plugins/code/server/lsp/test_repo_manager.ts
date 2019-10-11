/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable no-console */

import fs from 'fs';
import rimraf from 'rimraf';

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
    this.repos.forEach(repo => {
      this.cleanRepo(repo.path);
    });
  }

  public async cleanRepo(path: string) {
    return new Promise(resolve => {
      if (fs.existsSync(path)) {
        rimraf(path, resolve);
      } else {
        resolve(true);
      }
    });
  }

  public getRepo(language: string): Repo {
    return this.repos.filter(repo => {
      return repo.language === language;
    })[0];
  }
}
