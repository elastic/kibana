/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as lsp from 'vscode-languageserver';
import { IConnection } from 'vscode-languageserver';
import { createLspConnection } from '@elastic/ctags-langserver/lib/lsp-connection';
import { Logger } from '../../log';
import { EmbedProgram } from './embed_program';

export class EmbedCtagServer extends EmbedProgram {
  private connection: IConnection | null = null;
  constructor(readonly port: number, log: Logger) {
    super(log);
  }

  async stop(): Promise<void> {
    if (this.connection) {
      this.connection.dispose();
    }
  }

  async start(): Promise<void> {
    this.connection = createLspConnection({
      ctagsPath: '',
      showMessageLevel: lsp.MessageType.Warning,
      socketPort: this.port,
    });
    this.connection.listen();
  }
}
