/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SymbolLocator } from '@elastic/lsp-extension';
import { TextDocumentPositionParams } from 'vscode-languageserver';
import {
  Definition,
  DocumentSymbolParams,
  Hover,
  Location,
  SymbolInformation,
} from 'vscode-languageserver-types';
import { LspClient } from './lsp_client';
import { LspMethod } from './lsp_method';

export class TextDocumentMethods {
  public documentSymbol: LspMethod<DocumentSymbolParams, SymbolInformation[]>;
  public hover: LspMethod<TextDocumentPositionParams, Hover>;
  public definition: LspMethod<TextDocumentPositionParams, Definition>;
  public edefinition: LspMethod<TextDocumentPositionParams, SymbolLocator[]>;
  public references: LspMethod<TextDocumentPositionParams, Location[]>;

  private readonly client: LspClient;

  constructor(client: LspClient) {
    this.client = client;
    this.documentSymbol = new LspMethod('textDocument/documentSymbol', this.client);
    this.hover = new LspMethod('textDocument/hover', this.client);
    this.definition = new LspMethod('textDocument/definition', this.client);
    this.edefinition = new LspMethod('textDocument/edefinition', this.client);
    this.references = new LspMethod('textDocument/references', this.client);
  }
}
