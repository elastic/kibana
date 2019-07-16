/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DetailSymbolInformation } from '@elastic/lsp-extension';

import { kfetch } from 'ui/kfetch';
import { Location } from 'vscode-languageserver-types';
import { monaco } from '../monaco';
import { LspRestClient, TextDocumentMethods } from '../../../common/lsp_client';

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
      const res: any = await kfetch({ pathname: `/api/code/lsp/symbol/${qname}` });
      if (res.symbols) {
        return res.symbols.map((s: DetailSymbolInformation) =>
          handleLocation(s.symbolInformation.location)
        );
      }
      return [];
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
      const locations = result.filter(l => l.location !== undefined).map(l => l.location!);
      if (locations.length > 0) {
        return locations.map(handleLocation);
      } else {
        let qnameResults: monaco.languages.Location[] = [];
        for (const l of result) {
          if (l.qname) {
            qnameResults = qnameResults.concat(await handleQname(l.qname));
          }
        }
        return qnameResults;
      }
    }

    return [];
  },
};
