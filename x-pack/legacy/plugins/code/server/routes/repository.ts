/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { KibanaRequest, KibanaResponseFactory, RequestHandlerContext } from 'src/core/server';

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
import { getReferenceHelper } from '../utils/repository_reference_helper';

export function repositoryRoute(
  router: CodeServerRouter,
  codeServices: CodeServices,
  repoIndexInitializerFactory: RepositoryIndexInitializerFactory,
  repoConfigController: RepositoryConfigController,
  options: ServerOptions,
  log: Logger
) {
  const repositoryService = codeServices.serviceFor(RepositoryServiceDefinition);
  // Clone a git repository
  router.route({
    path: '/api/code/repo',
    requireAdmin: true,
    method: 'POST',
    async npHandler(
      context: RequestHandlerContext,
      req: KibanaRequest,
      res: KibanaResponseFactory
    ) {
      const repoUrl: string = (req.body as any).url;

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
        return res.badRequest({ body: error });
      }

      const repo = RepositoryUtils.buildRepository(repoUrl);
      const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(context, req));

      try {
        // Check if the repository already exists
        await repoObjectClient.getRepository(repo.uri);
        // distinguish between that the repository exists in the current space and that the repository exists in
        // another space, and return the default message if error happens during reference checking.
        try {
          const hasRef = await getReferenceHelper(context.core.savedObjects.client).hasReference(
            repo.uri
          );
          if (!hasRef) {
            return res.custom({
              statusCode: 409, // conflict
              body: i18n.translate(
                'xpack.code.repositoryManagement.repoOtherSpaceImportedMessage',
                {
                  defaultMessage: 'The repository has already been imported in another space!',
                }
              ),
            });
          }
        } catch (e) {
          log.error(`Failed to check reference for ${repo.uri} in current space`);
        }
        const msg = `Repository ${repoUrl} already exists. Skip clone.`;
        log.info(msg);
        return res.custom({ statusCode: 304, body: msg });
      } catch (error) {
        log.info(`Repository ${repoUrl} does not exist. Go ahead with clone.`);
        try {
          // create the reference first, and make the creation idempotent, to avoid potential dangling repositories
          // which have no references from any space, in case the writes to ES may fail independently
          await getReferenceHelper(context.core.savedObjects.client).createReference(repo.uri);

          // Create the index for the repository
          const initializer = (await repoIndexInitializerFactory.create(
            repo.uri,
            ''
          )) as RepositoryIndexInitializer;
          await initializer.init();

          // Persist to elasticsearch
          await repoObjectClient.setRepository(repo.uri, repo);

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
          return res.ok({ body: repo });
        } catch (error2) {
          const msg = `Issue repository clone request for ${repoUrl} error`;
          log.error(msg);
          log.error(error2);
          return res.badRequest({ body: msg });
        }
      }
    },
  });

  // Remove a git repository
  router.route({
    path: '/api/code/repo/{uri*3}',
    requireAdmin: true,
    method: 'DELETE',
    async npHandler(
      context: RequestHandlerContext,
      req: KibanaRequest,
      res: KibanaResponseFactory
    ) {
      const { uri: repoUri } = req.params as any;
      const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(context, req));
      try {
        // make sure the repo belongs to the current space
        getReferenceHelper(context.core.savedObjects.client).ensureReference(repoUri);

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
            return res.custom({ statusCode: 304, body: msg });
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
        // delete the reference last to avoid dangling repositories
        await getReferenceHelper(context.core.savedObjects.client).deleteReference(repoUri);
        return res.ok();
      } catch (error) {
        const msg = `Issue repository delete request for ${repoUri} error`;
        log.error(msg);
        log.error(error);
        return res.notFound({ body: msg });
      }
    },
  });

  // Get a git repository
  router.route({
    path: '/api/code/repo/{uri*3}',
    method: 'GET',
    async npHandler(
      context: RequestHandlerContext,
      req: KibanaRequest,
      res: KibanaResponseFactory
    ) {
      const { uri: repoUri } = req.params as any;
      try {
        await getReferenceHelper(context.core.savedObjects.client).ensureReference(repoUri);
        const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(context, req));
        const repo = await repoObjectClient.getRepository(repoUri);
        return res.ok({ body: repo });
      } catch (error) {
        const msg = `Get repository ${repoUri} error`;
        log.error(msg);
        log.error(error);
        return res.notFound({ body: msg });
      }
    },
  });

  router.route({
    path: '/api/code/repo/status/{uri*3}',
    method: 'GET',
    async npHandler(
      context: RequestHandlerContext,
      req: KibanaRequest,
      res: KibanaResponseFactory
    ) {
      const { uri: repoUri } = req.params as any;
      try {
        const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(context, req));
        let gitStatus = null;
        let indexStatus = null;
        let deleteStatus = null;
        const hasRef = await getReferenceHelper(context.core.savedObjects.client).hasReference(
          repoUri
        );

        if (hasRef) {
          try {
            gitStatus = await repoObjectClient.getRepositoryGitStatus(repoUri);
          } catch (error) {
            log.debug(`Get repository git status ${repoUri} error: ${error}`);
          }

          try {
            indexStatus = await repoObjectClient.getRepositoryIndexStatus(repoUri);
          } catch (error) {
            log.debug(`Get repository index status ${repoUri} error: ${error}`);
          }

          try {
            deleteStatus = await repoObjectClient.getRepositoryDeleteStatus(repoUri);
          } catch (error) {
            log.debug(`Get repository delete status ${repoUri} error: ${error}`);
          }
        }
        const status = {
          gitStatus,
          indexStatus,
          deleteStatus,
        };
        return res.ok({ body: status });
      } catch (error) {
        const msg = `Get repository status ${repoUri} error`;
        log.error(msg);
        log.error(error);
        return res.notFound({ body: msg });
      }
    },
  });

  // Get all git repositories
  router.route({
    path: '/api/code/repos',
    method: 'GET',
    async npHandler(
      context: RequestHandlerContext,
      req: KibanaRequest,
      res: KibanaResponseFactory
    ) {
      try {
        const uris = await getReferenceHelper(context.core.savedObjects.client).findReferences();
        const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(context, req));
        const repo = await repoObjectClient.getRepositories(uris);
        return res.ok({ body: repo });
      } catch (error) {
        const msg = `Get all repositories error`;
        log.error(msg);
        log.error(error);
        return res.notFound({ body: msg });
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
    async npHandler(
      context: RequestHandlerContext,
      req: KibanaRequest,
      res: KibanaResponseFactory
    ) {
      const { uri: repoUri } = req.params as any;
      const reindex: boolean = (req.body as any).reindex;
      try {
        await getReferenceHelper(context.core.savedObjects.client).ensureReference(repoUri);
        const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(context, req));
        const cloneStatus = await repoObjectClient.getRepositoryGitStatus(repoUri);

        const payload = {
          uri: repoUri,
          revision: cloneStatus.revision,
          enforceReindex: reindex,
        };
        const endpoint = await codeServices.locate(req, repoUri);
        await repositoryService.index(endpoint, payload);
        return res.ok();
      } catch (error) {
        const msg = `Index repository ${repoUri} error`;
        log.error(msg);
        log.error(error);
        return res.notFound({ body: msg });
      }
    },
  });

  // Update a repo config
  router.route({
    path: '/api/code/repo/config/{uri*3}',
    method: 'PUT',
    requireAdmin: true,
    async npHandler(
      context: RequestHandlerContext,
      req: KibanaRequest,
      res: KibanaResponseFactory
    ) {
      const config: RepositoryConfig = req.body as RepositoryConfig;
      const repoUri: RepositoryUri = config.uri;
      const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(context, req));

      try {
        // Check if the repository exists
        await getReferenceHelper(context.core.savedObjects.client).ensureReference(repoUri);
        await repoObjectClient.getRepository(repoUri);
      } catch (error) {
        return res.badRequest({ body: `Repository not existed for ${repoUri}` });
      }

      try {
        // Persist to elasticsearch
        await repoObjectClient.setRepositoryConfig(repoUri, config);
        repoConfigController.resetConfigCache(repoUri);
        return res.ok();
      } catch (error) {
        const msg = `Update repository config for ${repoUri} error`;
        log.error(msg);
        log.error(error);
        return res.notFound({ body: msg });
      }
    },
  });

  // Get repository config
  router.route({
    path: '/api/code/repo/config/{uri*3}',
    method: 'GET',
    async npHandler(
      context: RequestHandlerContext,
      req: KibanaRequest,
      res: KibanaResponseFactory
    ) {
      const { uri: repoUri } = req.params as any;
      try {
        await getReferenceHelper(context.core.savedObjects.client).ensureReference(repoUri);
        const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(context, req));
        const config = await repoObjectClient.getRepositoryConfig(repoUri);
        return res.ok({ body: config });
      } catch (error) {
        return res.notFound({ body: `Repository config ${repoUri} not exist` });
      }
    },
  });
}
