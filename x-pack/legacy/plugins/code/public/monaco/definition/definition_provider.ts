/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import queryString from 'querystring';
import { DetailSymbolInformation } from '@elastic/lsp-extension';

import { npStart } from 'ui/new_platform';
import { Location } from 'vscode-languageserver-types';
import { monaco } from '../monaco';
import { LspRestClient, TextDocumentMethods } from '../../../common/lsp_client';
import { parseSchema } from '../../../common/uri_util';
import { history } from '../../utils/url';

export const definitionProvider: monaco.languages.DefinitionProvider = {
  async provideDefinition(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    token: monaco.CancellationToken
  ): Promise<monaco.languages.Location[]> {
    const lspClient = new LspRestClient('/api/code/lsp');
    const lspMethods = new TextDocumentMethods(lspClient);
    function handleLocation(location: Location): monaco.languages.Location {
      return {
        uri: monaco.Uri.parse(location.uri),
        range: {
          startLineNumber: location.range.start.line + 1,
          startColumn: location.range.start.character + 1,
          endLineNumber: location.range.end.line + 1,
          endColumn: location.range.end.character + 1,
        },
      };
    }

    async function handleQname(qname: string): Promise<monaco.languages.Location[]> {
      const res = await npStart.core.http.get(`/api/code/lsp/symbol/${qname}`);
      if (res.symbols) {
        return res.symbols.map((s: DetailSymbolInformation) =>
          handleLocation(s.symbolInformation.location)
        );
      }
      return [];
    }

    function openDefinitionsPanel() {
      if (model && position) {
        const { uri } = parseSchema(model.uri.toString());
        const refUrl = `git:/${uri}!L${position.lineNumber - 1}:${position.column - 1}`;
        const queries = url.parse(history.location.search, true).query;
        const query = queryString.stringify({
          ...queries,
          tab: 'definitions',
          refUrl,
        });
        history.push(`${uri}?${query}`);
      }
    }

    const result = await lspMethods.edefinition.send({
      position: {
        line: position.lineNumber - 1,
        character: position.column - 1,
      },
      textDocument: {
        uri: model.uri.toString(),
      },
    });

    if (result) {
      if (result.length > 1) {
        openDefinitionsPanel();
        return result.filter(l => l.location !== undefined).map(l => handleLocation(l.location!));
      } else {
        const l = result[0];
        const location = l.location;
        if (location) {
          return [handleLocation(location)];
        } else if (l.qname) {
          return await handleQname(l.qname);
        }
      }
    }
    return [];
  },
};
