/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Hover } from 'vscode-languageserver-types';
import { LspRestClient, TextDocumentMethods } from '../../../common/lsp_client';
import { AsyncTask, Computer } from '../computer';

export const LOADING = 'loading';

export class HoverComputer implements Computer<Hover> {
  private lspMethods: TextDocumentMethods;
  private range: any = null;
  private uri: string | null = null;

  constructor() {
    const lspClient = new LspRestClient('/api/code/lsp');
    this.lspMethods = new TextDocumentMethods(lspClient);
  }

  public setParams(uri: string, range: any) {
    this.range = range;
    this.uri = uri;
  }

  public compute(): AsyncTask<Hover> {
    return this.lspMethods.hover.asyncTask({
      position: {
        line: this.range!.startLineNumber - 1,
        character: this.range!.startColumn - 1,
      },
      textDocument: {
        uri: this.uri!,
      },
    });
  }

  public loadingMessage(): Hover {
    return {
      range: {
        start: {
          line: this.range.startLineNumber - 1,
          character: this.range.startColumn - 1,
        },
        end: {
          line: this.range.endLineNumber - 1,
          character: this.range.endColumn - 1,
        },
      },
      contents: LOADING,
    };
  }
}
