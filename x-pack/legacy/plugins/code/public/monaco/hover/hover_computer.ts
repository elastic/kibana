/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Hover } from 'vscode-languageserver-types';
import { LspRestClient, TextDocumentMethods } from '../../../common/lsp_client';
import { AsyncTask, Computer } from '../computer';
import { store } from '../../stores/index';
import { statusSelector } from '../../selectors';
import { LangServerType, RepoFileStatus } from '../../../common/repo_file_status';
import { ServerNotInitialized } from '../../../common/lsp_error_codes';

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
    const status = statusSelector(store.getState());
    if (
      status &&
      status.langServerType !== LangServerType.NONE &&
      status.fileStatus !== RepoFileStatus.FILE_NOT_SUPPORTED &&
      status.fileStatus !== RepoFileStatus.FILE_IS_TOO_BIG
    ) {
      if (status.langServerStatus === RepoFileStatus.LANG_SERVER_IS_INITIALIZING) {
        return this.initializing();
      }

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
    return this.empty();
  }

  private empty(): AsyncTask<Hover> {
    const empty = {
      range: this.lspRange(),
      contents: [],
    };
    return {
      cancel(): void {},
      promise(): Promise<Hover> {
        return Promise.resolve(empty);
      },
    };
  }

  private initializing(): AsyncTask<Hover> {
    return {
      cancel(): void {},
      promise(): Promise<Hover> {
        return Promise.reject({ code: ServerNotInitialized });
      },
    };
  }

  private lspRange() {
    return {
      start: {
        line: this.range.startLineNumber - 1,
        character: this.range.startColumn - 1,
      },
      end: {
        line: this.range.endLineNumber - 1,
        character: this.range.endColumn - 1,
      },
    };
  }

  public loadingMessage(): Hover {
    return {
      range: this.lspRange(),
      contents: LOADING,
    };
  }
}
