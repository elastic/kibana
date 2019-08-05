/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { groupBy, last } from 'lodash';
import { ResponseError } from 'vscode-jsonrpc';
import { ResponseMessage } from 'vscode-jsonrpc/lib/messages';
import { Location } from 'vscode-languageserver-types';

import {
  LanguageServerStartFailed,
  ServerNotInitialized,
  UnknownFileLanguage,
} from '../../common/lsp_error_codes';
import { parseLspUrl } from '../../common/uri_util';
import { Logger } from '../log';
import { CTAGS, GO } from '../lsp/language_servers';
import { SymbolSearchClient } from '../search';
import { CodeServerRouter } from '../security';
import { ServerOptions } from '../server_options';
import {
  expandRanges,
  extractSourceContent,
  LineMapping,
  mergeRanges,
} from '../utils/composite_source_merger';
import { detectLanguage } from '../utils/detect_language';
import { EsClientWithRequest } from '../utils/esclient_with_request';
import { promiseTimeout } from '../utils/timeout';
import { RequestFacade, ResponseToolkitFacade } from '../..';
import { CodeServices } from '../distributed/code_services';
import { GitServiceDefinition, LspServiceDefinition } from '../distributed/apis';

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
              timeoutForInitializeMs: 1000,
            });
            return await promiseTimeout(serverOptions.lsp.requestTimeoutMs, requestPromise);
          } catch (error) {
            if (error instanceof ResponseError) {
              // hide some errors;
              if (
                error.code !== UnknownFileLanguage ||
                error.code !== ServerNotInitialized ||
                error.code !== LanguageServerStartFailed
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
            timeoutForInitializeMs: 1000,
          })
        );
        const hover = await lspService.sendRequest(endpoint, {
          method: 'textDocument/hover',
          params: {
            textDocument: { uri },
            position,
          },
        });
        let title: string;
        if (hover.result && hover.result.contents) {
          if (Array.isArray(hover.result.contents)) {
            const content = hover.result.contents[0];
            title = hover.result.contents[0].value;
            const lang = await detectLanguage(uri.replace('file://', ''));
            // TODO(henrywong) Find a gernal approach to construct the reference title.
            if (content.kind) {
              // The format of the hover result is 'MarkupContent', extract appropriate pieces as the references title.
              if (GO.languages.includes(lang)) {
                title = title.substring(title.indexOf('```go\n') + 5, title.lastIndexOf('\n```'));
                if (title.includes('{\n')) {
                  title = title.substring(0, title.indexOf('{\n'));
                }
              }
            } else if (CTAGS.languages.includes(lang)) {
              // There are language servers may provide hover results with markdown syntax, like ctags-langserver,
              // extract the plain text.
              if (title.substring(0, 2) === '**' && title.includes('**\n')) {
                title = title.substring(title.indexOf('**\n') + 3);
              }
            }
          } else {
            title = hover.result.contents as 'string';
          }
        } else {
          title = last(uri.toString().split('/')) + `(${position.line}, ${position.character})`;
        }
        const files = [];
        const groupedLocations = groupBy(response.result as Location[], 'uri');
        for (const url of Object.keys(groupedLocations)) {
          const { repoUri, revision, file } = parseLspUrl(url)!;
          const ep = await codeServices.locate(req, repoUri);
          const locations: Location[] = groupedLocations[url];
          const lines = locations.map(l => ({
            startLine: l.range.start.line,
            endLine: l.range.end.line,
          }));
          const ranges = expandRanges(lines, 1);
          const mergedRanges = mergeRanges(ranges);
          const blob = await gitService.blob(ep, { uri: repoUri, path: file!, revision });
          if (blob.content) {
            const source = blob.content.split('\n');
            const language = blob.lang;
            const lineMappings = new LineMapping();
            const code = extractSourceContent(mergedRanges, source, lineMappings).join('\n');
            const lineNumbers = lineMappings.toStringArray();
            const highlights = locations.map(l => {
              const { start, end } = l.range;
              const startLineNumber = lineMappings.lineNumber(start.line);
              const endLineNumber = lineMappings.lineNumber(end.line);
              return {
                startLineNumber,
                startColumn: start.character + 1,
                endLineNumber,
                endColumn: end.character + 1,
              };
            });
            files.push({
              repo: repoUri,
              file,
              language,
              uri: url,
              revision,
              code,
              lineNumbers,
              highlights,
            });
          }
        }
        return { title, files: groupBy(files, 'repo'), uri, position };
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
        const res = await symbolSearchClient.findByQname(req.params.qname);
        return res;
      } catch (error) {
        return Boom.internal(`Search Exception`);
      }
    },
  });
}
