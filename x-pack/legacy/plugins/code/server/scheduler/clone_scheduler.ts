/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';

import { RepositoryUtils } from '../../common/repository_utils';
import { Repository } from '../../model';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { CloneWorker } from '../queue';
import { RepositoryObjectClient } from '../search';
import { ServerOptions } from '../server_options';
import { AbstractScheduler } from './abstract_scheduler';

// Currently, this clone schedule is only used for reclone git repository
// in case the local repository is gone for any reasons. This will only
// be scheduled once at the startup time of Kibana.
export class CloneScheduler extends AbstractScheduler {
  private objectClient: RepositoryObjectClient;

  constructor(
    private readonly cloneWorker: CloneWorker,
    private readonly serverOptions: ServerOptions,
    protected readonly client: EsClient,
    protected readonly log: Logger,
    protected readonly onScheduleFinished?: () => void
  ) {
    super(client, Number.MAX_SAFE_INTEGER, onScheduleFinished);
    this.objectClient = new RepositoryObjectClient(this.client);
  }

  protected getRepoSchedulingFrequencyMs() {
    // We don't need this scheduler to be executed repeatedly for now.
    return Number.MAX_SAFE_INTEGER;
  }

  protected async executeSchedulingJob(repo: Repository) {
    const { uri, url } = repo;
    this.log.debug(`Try to schedule clone repo request for ${uri}`);
    try {
      // 1. Check if the repository is in deletion
      let inDelete = false;
      try {
        await this.objectClient.getRepositoryDeleteStatus(repo.uri);
        inDelete = true;
      } catch (error) {
        inDelete = false;
      }

      // 2. Check if the folder exsits
      const path = RepositoryUtils.repositoryLocalPath(this.serverOptions.repoPath, uri);
      const repoExist = fs.existsSync(path);

      if (!inDelete && !repoExist) {
        this.log.info(
          `Repository does not exist on local disk. Start to schedule clone repo request for ${uri}`
        );
        const payload = { url };
        await this.cloneWorker.enqueueJob(payload, {});
      } else {
        this.log.debug(
          `Repository ${uri} has not been fully cloned yet or in update/delete. Skip clone.`
        );
      }
    } catch (error) {
      this.log.error(`Schedule clone for ${uri} error.`);
      this.log.error(error);
    }
  }
}
