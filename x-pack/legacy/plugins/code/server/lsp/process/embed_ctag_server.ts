/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as lsp from 'vscode-languageserver';
import { DidChangeWorkspaceFoldersNotification, IConnection } from 'vscode-languageserver';
import { createServerSocketTransport } from 'vscode-languageserver-protocol';
// @ts-ignore
import { LspServer } from '@elastic/ctags-langserver/lib/lsp-server';
// @ts-ignore
import { LspClientLogger } from '@elastic/ctags-langserver/lib/logger';
// @ts-ignore
import { LspClientImpl } from '@elastic/ctags-langserver/lib/lsp-client';
import {
  EDefinitionRequest,
  FullRequest,
  // @ts-ignore
} from '@elastic/ctags-langserver/lib/lsp-protocol.edefinition.proposed';
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
    const [reader, writer] = createServerSocketTransport(this.port);
    const connection = lsp.createConnection(reader, writer);
    const lspClient = new LspClientImpl(connection);
    const logger = new LspClientLogger(lspClient, lsp.MessageType.Warning);
    const server: any = new LspServer({
      logger,
      ctagsPath: '',
    });

    connection.onInitialize(server.initialize.bind(server));
    connection.onNotification(
      DidChangeWorkspaceFoldersNotification.type,
      server.didChangeWorkspaceFolders.bind(server)
    );
    connection.onRequest(EDefinitionRequest.type, server.eDefinition.bind(server));
    connection.onRequest(FullRequest.type, server.full.bind(server));
    connection.onDocumentSymbol(server.documentSymbol.bind(server));
    connection.onHover(server.hover.bind(server));
    connection.onReferences(server.reference.bind(server));
    this.connection = connection;
    connection.listen();
  }
}
