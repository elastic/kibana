/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { RequestFacade, ResponseToolkitFacade } from '../..';
import { validateGitUrl } from '../../common/git_url_utils';
import { RepositoryUtils } from '../../common/repository_utils';
import { RepositoryConfig, RepositoryUri, WorkerReservedProgress } from '../../model';
import { RepositoryIndexInitializer, RepositoryIndexInitializerFactory } from '../indexer';
import { Logger } from '../log';
import { RepositoryConfigController } from '../repository_config_controller';
import { RepositoryObjectClient } from '../search';
import { ServerOptions } from '../server_options';
import { EsClientWithRequest } from '../utils/esclient_with_request';
import { CodeServerRouter } from '../security';
import { CodeServices } from '../distributed/code_services';
import { RepositoryServiceDefinition } from '../distributed/apis';

export function repositoryRoute(
  router: CodeServerRouter,
  codeServices: CodeServices,
  repoIndexInitializerFactory: RepositoryIndexInitializerFactory,
  repoConfigController: RepositoryConfigController,
  options: ServerOptions
) {
  const repositoryService = codeServices.serviceFor(RepositoryServiceDefinition);
  // Clone a git repository
  router.route({
    path: '/api/code/repo',
    requireAdmin: true,
    method: 'POST',
    async handler(req: RequestFacade, h: ResponseToolkitFacade) {
      const repoUrl: string = (req.payload as any).url;
      const log = new Logger(req.server);

      // Reject the request if the url is an invalid git url.
      try {
        validateGitUrl(
          repoUrl,
          options.security.gitHostWhitelist,
          options.security.gitProtocolWhitelist
        );
      } catch (error) {
        log.error(`Validate git url ${repoUrl} error.`);
        log.error(error);
        return Boom.badRequest(error);
      }

      const repo = RepositoryUtils.buildRepository(repoUrl);
      const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(req));

      try {
        // Check if the repository already exists
        await repoObjectClient.getRepository(repo.uri);
        const msg = `Repository ${repoUrl} already exists. Skip clone.`;
        log.info(msg);
        return h.response(msg).code(304); // Not Modified
      } catch (error) {
        log.info(`Repository ${repoUrl} does not exist. Go ahead with clone.`);
        try {
          // Create the index for the repository
          const initializer = (await repoIndexInitializerFactory.create(
            repo.uri,
            ''
          )) as RepositoryIndexInitializer;
          await initializer.init();

          // Persist to elasticsearch
          await repoObjectClient.setRepository(repo.uri, repo);
          const randomStr = Math.random()
            .toString(36)
            .substring(2, 15);
          await repoObjectClient.setRepositoryRandomStr(repo.uri, randomStr);
          // Kick off clone job
          const payload = {
            url: repoUrl,
          };
          // before the repository is cloned, it doesn't exist in the cluster
          // in this case, it should be allocated right away, otherwise it cannot be found in the cluster
          const endpoint = await codeServices.allocate(req, repoUrl);
          // the endpoint could be undefined, as we may not clone it here for the cluster mode implementation
          if (endpoint) {
            await repositoryService.clone(endpoint, payload);
          }
          return repo;
        } catch (error2) {
          const msg = `Issue repository clone request for ${repoUrl} error`;
          log.error(msg);
          log.error(error2);
          return Boom.badRequest(msg);
        }
      }
    },
  });

  // Remove a git repository
  router.route({
    path: '/api/code/repo/{uri*3}',
    requireAdmin: true,
    method: 'DELETE',
    async handler(req: RequestFacade, h: ResponseToolkitFacade) {
      const repoUri: string = req.params.uri as string;
      const log = new Logger(req.server);
      const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(req));
      try {
        // Check if the repository already exists. If not, an error will be thrown.
        await repoObjectClient.getRepository(repoUri);

        // Check if the repository delete status already exists. If so, we should ignore this
        // request.
        try {
          const status = await repoObjectClient.getRepositoryDeleteStatus(repoUri);
          // if the delete status is an ERROR, we can give it another try
          if (status.progress !== WorkerReservedProgress.ERROR) {
            const msg = `Repository ${repoUri} is already in delete.`;
            log.info(msg);
            return h.response(msg).code(304); // Not Modified
          }
        } catch (error) {
          // Do nothing here since this error is expected.
          log.info(`Repository ${repoUri} delete status does not exist. Go ahead with delete.`);
        }

        const payload = {
          uri: repoUri,
        };
        const endpoint = await codeServices.locate(req, repoUri);
        await repositoryService.delete(endpoint, payload);
        return {};
      } catch (error) {
        const msg = `Issue repository delete request for ${repoUri} error`;
        log.error(msg);
        log.error(error);
        return Boom.notFound(msg);
      }
    },
  });

  // Get a git repository
  router.route({
    path: '/api/code/repo/{uri*3}',
    method: 'GET',
    async handler(req: RequestFacade) {
      const repoUri = req.params.uri as string;
      const log = new Logger(req.server);
      try {
        const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(req));
        return await repoObjectClient.getRepository(repoUri);
      } catch (error) {
        const msg = `Get repository ${repoUri} error`;
        log.error(msg);
        log.error(error);
        return Boom.notFound(msg);
      }
    },
  });

  router.route({
    path: '/api/code/repo/status/{uri*3}',
    method: 'GET',
    async handler(req: RequestFacade) {
      const repoUri = req.params.uri as string;
      const log = new Logger(req.server);
      try {
        const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(req));
        let gitStatus = null;
        try {
          gitStatus = await repoObjectClient.getRepositoryGitStatus(repoUri);
        } catch (error) {
          log.debug(`Get repository git status ${repoUri} error: ${error}`);
        }

        let indexStatus = null;
        try {
          indexStatus = await repoObjectClient.getRepositoryIndexStatus(repoUri);
        } catch (error) {
          log.debug(`Get repository index status ${repoUri} error: ${error}`);
        }

        let deleteStatus = null;
        try {
          deleteStatus = await repoObjectClient.getRepositoryDeleteStatus(repoUri);
        } catch (error) {
          log.debug(`Get repository delete status ${repoUri} error: ${error}`);
        }
        return {
          gitStatus,
          indexStatus,
          deleteStatus,
        };
      } catch (error) {
        const msg = `Get repository status ${repoUri} error`;
        log.error(msg);
        log.error(error);
        return Boom.notFound(msg);
      }
    },
  });

  // Get all git repositories
  router.route({
    path: '/api/code/repos',
    method: 'GET',
    async handler(req: RequestFacade) {
      const log = new Logger(req.server);
      try {
        const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(req));
        return await repoObjectClient.getAllRepositories();
      } catch (error) {
        const msg = `Get all repositories error`;
        log.error(msg);
        log.error(error);
        return Boom.notFound(msg);
      }
    },
  });

  // Issue a repository index task.
  // TODO(mengwei): This is just temporary API stub to trigger the index job. Eventually in the near
  // future, this route will be removed. The scheduling strategy is still in discussion.
  router.route({
    path: '/api/code/repo/index/{uri*3}',
    method: 'POST',
    requireAdmin: true,
    async handler(req: RequestFacade) {
      const repoUri = req.params.uri as string;
      const log = new Logger(req.server);
      const reindex: boolean = (req.payload as any).reindex;
      try {
        const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(req));
        const cloneStatus = await repoObjectClient.getRepositoryGitStatus(repoUri);

        const payload = {
          uri: repoUri,
          revision: cloneStatus.revision,
          enforceReindex: reindex,
        };
        const endpoint = await codeServices.locate(req, repoUri);
        await repositoryService.index(endpoint, payload);
        return {};
      } catch (error) {
        const msg = `Index repository ${repoUri} error`;
        log.error(msg);
        log.error(error);
        return Boom.notFound(msg);
      }
    },
  });

  // Update a repo config
  router.route({
    path: '/api/code/repo/config/{uri*3}',
    method: 'PUT',
    requireAdmin: true,
    async handler(req: RequestFacade) {
      const config: RepositoryConfig = req.payload as RepositoryConfig;
      const repoUri: RepositoryUri = config.uri;
      const log = new Logger(req.server);
      const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(req));

      try {
        // Check if the repository exists
        await repoObjectClient.getRepository(repoUri);
      } catch (error) {
        return Boom.badRequest(`Repository not existed for ${repoUri}`);
      }

      try {
        // Persist to elasticsearch
        await repoObjectClient.setRepositoryConfig(repoUri, config);
        repoConfigController.resetConfigCache(repoUri);
        return {};
      } catch (error) {
        const msg = `Update repository config for ${repoUri} error`;
        log.error(msg);
        log.error(error);
        return Boom.badRequest(msg);
      }
    },
  });

  // Get repository config
  router.route({
    path: '/api/code/repo/config/{uri*3}',
    method: 'GET',
    async handler(req: RequestFacade) {
      const repoUri = req.params.uri as string;
      try {
        const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(req));
        return await repoObjectClient.getRepositoryConfig(repoUri);
      } catch (error) {
        return Boom.notFound(`Repository config ${repoUri} not exist`);
      }
    },
  });
}
