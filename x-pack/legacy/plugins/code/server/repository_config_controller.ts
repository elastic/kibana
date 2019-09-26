/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseLspUrl } from '../common/uri_util';
import { RepositoryConfig } from '../model';
import { EsClient } from '../server/lib/esqueue';
import { RepositoryObjectClient } from './search';

export class RepositoryConfigController {
  private repositoryConfigCache: { [repoUri: string]: RepositoryConfig } = {};
  private repoObjectClient: RepositoryObjectClient;

  constructor(readonly esClient: EsClient) {
    this.repoObjectClient = new RepositoryObjectClient(esClient);
  }

  public async isLanguageDisabled(uri: string, lang: string): Promise<boolean> {
    const { repoUri } = parseLspUrl(uri)!;
    let repoConfig = this.repositoryConfigCache[repoUri];

    if (!repoConfig) {
      try {
        repoConfig = await this.repoObjectClient.getRepositoryConfig(repoUri);
      } catch (err) {
        return false;
      }
    }

    if (lang === 'go' && repoConfig.disableGo === true) {
      return true;
    }
    if (lang === 'java' && repoConfig.disableJava === true) {
      return true;
    }
    if (lang === 'typescript' && repoConfig.disableTypescript === true) {
      return true;
    }
    return false;
  }

  public async resetConfigCache(repoUri: string) {
    delete this.repositoryConfigCache[repoUri];
  }
}
