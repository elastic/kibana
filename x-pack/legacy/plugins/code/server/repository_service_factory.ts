/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from './log';
import { RepositoryService } from './repository_service';

export class RepositoryServiceFactory {
  public newInstance(
    repoPath: string,
    credsPath: string,
    log: Logger,
    enableGitCertCheck: boolean
  ): RepositoryService {
    return new RepositoryService(repoPath, credsPath, log, enableGitCertCheck);
  }
}
