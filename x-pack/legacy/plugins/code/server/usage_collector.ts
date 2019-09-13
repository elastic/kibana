/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerFacade } from '../';
import { APP_USAGE_TYPE } from '../common/constants';
import { LanguageServerStatus } from '../common/language_server';
import { CodeUsageMetrics } from '../model/usage_telemetry_metrics';
import { EsClient } from './lib/esqueue';
import { RepositoryObjectClient } from './search';
import { LspService } from './lsp/lsp_service';
import { CTAGS, GO, JAVA, TYPESCRIPT } from './lsp/language_servers';

export async function fetchCodeUsageMetrics(client: EsClient, lspService: LspService) {
  const repositoryObjectClient: RepositoryObjectClient = new RepositoryObjectClient(client);
  const allRepos = await repositoryObjectClient.getAllRepositories();
  const langServerEnabled = async (name: string) => {
    const status = await lspService.languageServerStatus(name);
    return status !== LanguageServerStatus.NOT_INSTALLED ? 1 : 0;
  };
  return {
    [CodeUsageMetrics.ENABLED]: 1,
    [CodeUsageMetrics.REPOSITORIES]: allRepos.length,
    [CodeUsageMetrics.LANGUAGE_SERVERS]: {
      [TYPESCRIPT.name]: await langServerEnabled(TYPESCRIPT.name),
      [JAVA.name]: await langServerEnabled(JAVA.name),
      [CTAGS.name]: await langServerEnabled(CTAGS.name),
      [GO.name]: await langServerEnabled(GO.name),
    },
  };
}

export function initCodeUsageCollector(
  server: ServerFacade,
  client: EsClient,
  lspService: LspService
) {
  const codeUsageCollector = server.usage.collectorSet.makeUsageCollector({
    type: APP_USAGE_TYPE,
    isReady: () => true,
    fetch: async (callCluster: any) => fetchCodeUsageMetrics(client, lspService),
  });

  server.usage.collectorSet.register(codeUsageCollector);
}
