/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResponseMessage } from 'vscode-jsonrpc/lib/messages';
import { LspService } from '../../lsp/lsp_service';
import { ServiceHandlerFor } from '../service_definition';
import { LanguageServerDefinition } from '../../lsp/language_servers';
import { LanguageServerStatus } from '../../../common/language_server';
import { WorkspaceStatus } from '../../lsp/request_expander';

export const LspServiceDefinitionOption = { routePrefix: '/api/code/internal/lsp' };
export const LspServiceDefinition = {
  sendRequest: {
    request: {} as { method: string; params: any; timeoutForInitializeMs?: number },
    response: {} as ResponseMessage,
  },
  languageSeverDef: {
    request: {} as { lang: string },
    response: {} as LanguageServerDefinition | null,
  },
  languageServerStatus: {
    request: {} as { lang: string },
    response: {} as LanguageServerStatus,
  },
  initializeState: {
    request: {} as { repoUri: string; revision: string },
    response: {} as { [p: string]: WorkspaceStatus },
  },
};

export const getLspServiceHandler = (
  lspService: LspService
): ServiceHandlerFor<typeof LspServiceDefinition> => ({
  async sendRequest({ method, params, timeoutForInitializeMs }) {
    return await lspService.sendRequest(method, params, timeoutForInitializeMs);
  },
  async languageSeverDef({ lang }) {
    return lspService.getLanguageSeverDef(lang);
  },
  async languageServerStatus({ lang }) {
    return await lspService.languageServerStatus(lang);
  },
  async initializeState({ repoUri, revision }) {
    return await lspService.initializeState(repoUri, revision);
  },
});
