/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable no-console */

import fs from 'fs';
import Git from '@elastic/nodegit';
import rimraf from 'rimraf';

import { TestConfig, Repo } from '../../model/test_config';

export class TestRepoManager {
  private repos: Repo[];

  constructor(testConfig: TestConfig) {
    this.repos = testConfig.repos;
  }

  public async importAllRepos() {
    for (const repo of this.repos) {
      await this.importRepo(repo.url, repo.path);
    }
  }

  public importRepo(url: string, path: string) {
    return new Promise(resolve => {
      if (!fs.existsSync(path)) {
        rimraf(path, error => {
          console.log(`begin to import ${url} to ${path}`);
          Git.Clone.clone(url, path, {
            fetchOpts: {
              callbacks: {
                certificateCheck: () => 0,
              },
            },
          }).then(repo => {
            console.log(`import ${url} done`);
            resolve(repo);
          });
        });
      } else {
        resolve();
      }
    });
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
