/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { CodeServerRouter } from '../security';
import { RequestFacade } from '../../';
import { LangServerType, RepoFileStatus, StatusReport } from '../../common/repo_file_status';
import { CTAGS, LanguageServerDefinition } from '../lsp/language_servers';
import { LanguageServerStatus } from '../../common/language_server';
import { WorkspaceStatus } from '../lsp/request_expander';
import { RepositoryObjectClient } from '../search';
import { EsClientWithRequest } from '../utils/esclient_with_request';
import { CodeServices } from '../distributed/code_services';
import { GitServiceDefinition, LspServiceDefinition } from '../distributed/apis';
import { Endpoint } from '../distributed/resource_locator';

export function statusRoute(router: CodeServerRouter, codeServices: CodeServices) {
  const gitService = codeServices.serviceFor(GitServiceDefinition);
  const lspService = codeServices.serviceFor(LspServiceDefinition);
  async function handleRepoStatus(
    endpoint: Endpoint,
    report: StatusReport,
    repoUri: string,
    revision: string,
    repoObjectClient: RepositoryObjectClient
  ) {
    const commit = await gitService.commit(endpoint, {
      uri: repoUri,
      revision: decodeURIComponent(revision),
    });
    const head = await gitService.headRevision(endpoint, { uri: repoUri });
    if (head === commit.id) {
      try {
        const indexStatus = await repoObjectClient.getRepositoryLspIndexStatus(repoUri);
        if (indexStatus.progress < 100) {
          report.repoStatus = RepoFileStatus.INDEXING;
        }
      } catch (e) {
        // index may not stated yet
        report.repoStatus = RepoFileStatus.INDEXING;
      }
    } else {
      report.repoStatus = RepoFileStatus.REVISION_NOT_INDEXED;
    }
  }

  async function handleFileStatus(
    endpoint: Endpoint,
    report: StatusReport,
    blob: { isBinary: boolean; imageType?: string; content?: string; lang?: string }
  ) {
    if (blob.content) {
      const lang: string = blob.lang!;
      const def = await lspService.languageSeverDef(endpoint, { lang });
      if (def === null) {
        report.fileStatus = RepoFileStatus.FILE_NOT_SUPPORTED;
      } else {
        return def;
      }
    } else {
      report.fileStatus = RepoFileStatus.FILE_IS_TOO_BIG;
    }
  }

  async function handleLspStatus(
    endpoint: Endpoint,
    report: StatusReport,
    def: LanguageServerDefinition,
    repoUri: string,
    revision: string
  ) {
    report.langServerType = def === CTAGS ? LangServerType.GENERIC : LangServerType.DEDICATED;
    const status = await lspService.languageServerStatus(endpoint, { lang: def.languages[0] });
    if (status === LanguageServerStatus.NOT_INSTALLED) {
      report.langServerStatus = RepoFileStatus.LANG_SERVER_NOT_INSTALLED;
    } else {
      const state = await lspService.initializeState(endpoint, { repoUri, revision });
      const initState = state[def.name];
      report.langServerStatus =
        initState === WorkspaceStatus.Initialized
          ? RepoFileStatus.LANG_SERVER_INITIALIZED
          : RepoFileStatus.LANG_SERVER_IS_INITIALIZING;
    }
  }

  router.route({
    path: '/api/code/repo/{uri*3}/status/{ref}/{path*}',
    method: 'GET',
    async handler(req: RequestFacade) {
      const { uri, path, ref } = req.params;
      const report: StatusReport = {};
      const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(req));
      const endpoint = await codeServices.locate(req, uri);

      try {
        // Check if the repository already exists
        await repoObjectClient.getRepository(uri);
      } catch (e) {
        return Boom.notFound(`repo ${uri} not found`);
      }
      await handleRepoStatus(endpoint, report, uri, ref, repoObjectClient);
      if (path) {
        try {
          try {
            const blob = await gitService.blob(endpoint, {
              uri,
              path,
              revision: decodeURIComponent(ref),
            });
            // text file
            if (!blob.isBinary) {
              const def = await handleFileStatus(endpoint, report, blob);
              if (def) {
                await handleLspStatus(endpoint, report, def, uri, ref);
              }
            }
          } catch (e) {
            // not a file? The path may be a dir.
          }
        } catch (e) {
          return Boom.internal(e.message || e.name);
        }
      }
      return report;
    },
  });
}
