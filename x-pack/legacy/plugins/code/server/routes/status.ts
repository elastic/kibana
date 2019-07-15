/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import hapi from 'hapi';
import Boom from 'boom';

import { LspService } from '../lsp/lsp_service';
import { GitOperations } from '../git_operations';
import { CodeServerRouter } from '../security';
import { LangServerType, RepoFileStatus, StatusReport } from '../../common/repo_file_status';
import { CTAGS, LanguageServerDefinition } from '../lsp/language_servers';
import { LanguageServerStatus } from '../../common/language_server';
import { WorkspaceStatus } from '../lsp/request_expander';
import { RepositoryObjectClient } from '../search';
import { EsClientWithRequest } from '../utils/esclient_with_request';
import { TEXT_FILE_LIMIT } from '../../common/file';
import { detectLanguage } from '../utils/detect_language';

export function statusRoute(
  server: CodeServerRouter,
  gitOps: GitOperations,
  lspService: LspService
) {
  async function handleRepoStatus(
    report: StatusReport,
    repoUri: string,
    revision: string,
    repoObjectClient: RepositoryObjectClient
  ) {
    const commit = await gitOps.getCommit(repoUri, decodeURIComponent(revision));
    const head = await gitOps.getHeadRevision(repoUri);
    if (head === commit.sha()) {
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

  async function handleFileStatus(report: StatusReport, content: Buffer, path: string) {
    if (content.length <= TEXT_FILE_LIMIT) {
      const lang: string = await detectLanguage(path, content);
      const def = lspService.getLanguageSeverDef(lang);
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
    report: StatusReport,
    def: LanguageServerDefinition,
    repoUri: string,
    revision: string
  ) {
    report.langServerType = def === CTAGS ? LangServerType.GENERIC : LangServerType.DEDICATED;
    if (lspService.languageServerStatus(def.languages[0]) === LanguageServerStatus.NOT_INSTALLED) {
      report.langServerStatus = RepoFileStatus.LANG_SERVER_NOT_INSTALLED;
    } else {
      const state = await lspService.initializeState(repoUri, revision);
      const initState = state[def.name];
      if (initState !== WorkspaceStatus.Initialized) {
        report.langServerStatus = RepoFileStatus.LANG_SERVER_IS_INITIALIZING;
      }
    }
  }

  server.route({
    path: '/api/code/repo/{uri*3}/status/{ref}/{path*}',
    method: 'GET',
    async handler(req: hapi.Request) {
      const { uri, path, ref } = req.params;
      const report: StatusReport = {
        langServerType: LangServerType.NONE,
      };
      const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(req));
      try {
        // Check if the repository already exists
        await repoObjectClient.getRepository(uri);
      } catch (e) {
        return Boom.notFound(`repo ${uri} not found`);
      }
      await handleRepoStatus(report, uri, ref, repoObjectClient);

      if (path) {
        try {
          try {
            const blob = await gitOps.fileContent(uri, path, decodeURIComponent(ref));
            // text file
            if (!blob.isBinary()) {
              const def = await handleFileStatus(report, blob.content(), path);
              if (def) {
                await handleLspStatus(report, def, uri, ref);
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
