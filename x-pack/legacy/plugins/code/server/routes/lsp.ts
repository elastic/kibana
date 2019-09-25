/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { ResponseError } from 'vscode-jsonrpc';
import { ResponseMessage } from 'vscode-jsonrpc/lib/messages';

import { SymbolLocator } from '@elastic/lsp-extension';
import {
  LanguageServerStartFailed,
  ServerNotInitialized,
  UnknownFileLanguage,
} from '../../common/lsp_error_codes';
import { parseLspUrl } from '../../common/uri_util';
import { Logger } from '../log';
import { SymbolSearchClient } from '../search';
import { CodeServerRouter } from '../security';
import { ServerOptions } from '../server_options';

import { EsClientWithRequest } from '../utils/esclient_with_request';
import { promiseTimeout } from '../utils/timeout';
import { RequestFacade, ResponseToolkitFacade } from '../..';
import { CodeServices } from '../distributed/code_services';
import { GitServiceDefinition, LspServiceDefinition } from '../distributed/apis';
import { findTitleFromHover, groupFiles } from '../utils/lsp_utils';

const LANG_SERVER_ERROR = 'language server error';

export function lspRoute(
  server: CodeServerRouter,
  codeServices: CodeServices,
  serverOptions: ServerOptions
) {
  const log = new Logger(server.server);
  const lspService = codeServices.serviceFor(LspServiceDefinition);
  const gitService = codeServices.serviceFor(GitServiceDefinition);

  server.route({
    path: '/api/code/lsp/textDocument/{method}',
    async handler(req: RequestFacade, h: ResponseToolkitFacade) {
      if (typeof req.payload === 'object' && req.payload != null) {
        const method = req.params.method;
        if (method) {
          try {
            const params = (req.payload as unknown) as any;
            const uri = params.textDocument.uri;
            const { repoUri } = parseLspUrl(uri)!;
            const endpoint = await codeServices.locate(req, repoUri);
            const requestPromise = lspService.sendRequest(endpoint, {
              method: `textDocument/${method}`,
              params: req.payload,
            });
            return await promiseTimeout(serverOptions.lsp.requestTimeoutMs, requestPromise);
          } catch (error) {
            if (error instanceof ResponseError) {
              // hide some errors;
              if (
                error.code === UnknownFileLanguage ||
                error.code === ServerNotInitialized ||
                error.code === LanguageServerStartFailed
              ) {
                log.debug(error);
              }
              return h
                .response({ error: { code: error.code, msg: LANG_SERVER_ERROR } })
                .type('json')
                .code(500); // different code for LS errors and other internal errors.
            } else if (error.isBoom) {
              return error;
            } else {
              log.error(error);
              return h
                .response({ error: { code: error.code || 500, msg: LANG_SERVER_ERROR } })
                .type('json')
                .code(500);
            }
          }
        } else {
          return h.response('missing `method` in request').code(400);
        }
      } else {
        return h.response('json body required').code(400); // bad request
      }
    },
    method: 'POST',
  });

  server.route({
    path: '/api/code/lsp/findDefinitions',
    method: 'POST',
    async handler(req: RequestFacade, h: ResponseToolkitFacade) {
      // @ts-ignore
      const { textDocument, position } = req.payload;
      const { uri } = textDocument;
      const endpoint = await codeServices.locate(req, parseLspUrl(uri).repoUri);
      const response: ResponseMessage = await promiseTimeout(
        serverOptions.lsp.requestTimeoutMs,
        lspService.sendRequest(endpoint, {
          method: `textDocument/edefinition`,
          params: { textDocument: { uri }, position },
        })
      );
      const hover = await lspService.sendRequest(endpoint, {
        method: 'textDocument/hover',
        params: {
          textDocument: { uri },
          position,
        },
      });
      const title: string = await findTitleFromHover(hover, uri, position);
      const symbolSearchClient = new SymbolSearchClient(new EsClientWithRequest(req), log);

      const locators = response.result as SymbolLocator[];
      const locations = [];
      for (const locator of locators) {
        if (locator.location) {
          locations.push(locator.location);
        } else if (locator.qname) {
          const searchResults = await symbolSearchClient.findByQname(req.params.qname);
          for (const symbol of searchResults.symbols) {
            locations.push(symbol.symbolInformation.location);
          }
        }
      }
      const files = await groupFiles(locations, async loc => {
        const ep = await codeServices.locate(req, loc.uri);
        return await gitService.blob(ep, loc);
      });
      return { title, files, uri, position };
    },
  });

  server.route({
    path: '/api/code/lsp/findReferences',
    method: 'POST',
    async handler(req: RequestFacade, h: ResponseToolkitFacade) {
      try {
        // @ts-ignore
        const { textDocument, position } = req.payload;
        const { uri } = textDocument;
        const endpoint = await codeServices.locate(req, parseLspUrl(uri).repoUri);
        const response: ResponseMessage = await promiseTimeout(
          serverOptions.lsp.requestTimeoutMs,
          lspService.sendRequest(endpoint, {
            method: `textDocument/references`,
            params: { textDocument: { uri }, position },
          })
        );
        const hover = await lspService.sendRequest(endpoint, {
          method: 'textDocument/hover',
          params: {
            textDocument: { uri },
            position,
          },
        });
        const title: string = await findTitleFromHover(hover, uri, position);
        const files = await groupFiles(response.result, async loc => {
          const ep = await codeServices.locate(req, loc.uri);
          return await gitService.blob(ep, loc);
        });
        return { title, files, uri, position };
      } catch (error) {
        log.error(error);
        if (error instanceof ResponseError) {
          return h
            .response({ error: { code: error.code, msg: LANG_SERVER_ERROR } })
            .type('json')
            .code(500); // different code for LS errors and other internal errors.
        } else if (error.isBoom) {
          return error;
        } else {
          return h
            .response({ error: { code: 500, msg: LANG_SERVER_ERROR } })
            .type('json')
            .code(500);
        }
      }
    },
  });
}

export function symbolByQnameRoute(router: CodeServerRouter, log: Logger) {
  router.route({
    path: '/api/code/lsp/symbol/{qname}',
    method: 'GET',
    async handler(req: RequestFacade) {
      try {
        const symbolSearchClient = new SymbolSearchClient(new EsClientWithRequest(req), log);
        return await symbolSearchClient.findByQname(req.params.qname);
      } catch (error) {
        return Boom.internal(`Search Exception`);
      }
    },
  });
}
