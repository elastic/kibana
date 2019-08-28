/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Range } from 'monaco-editor';
import { createAction } from 'redux-actions';
import { Hover, Position, TextDocumentPositionParams } from 'vscode-languageserver';

export interface PanelResults {
  repos: GroupedRepoResults[];
  title: string;
}

export interface GroupedRepoResults {
  repo: string;
  files: GroupedFileResults[];
}

export interface GroupedFileResults {
  uri: string;
  file: string;
  language: string;
  code: string;
  lineNumbers: string[];
  repo: string;
  revision: string;
  highlights: Range[];
}

export const findReferences = createAction<TextDocumentPositionParams>('FIND REFERENCES');
export const findReferencesSuccess = createAction<PanelResults>('FIND REFERENCES SUCCESS');
export const findReferencesFailed = createAction<Error>('FIND REFERENCES ERROR');
export const closePanel = createAction<boolean>('CLOSE PANEL');
export const hoverResult = createAction<Hover>('HOVER RESULT');
export const revealPosition = createAction<Position | undefined>('REVEAL POSITION');

export const findDefinitions = createAction<TextDocumentPositionParams>('FIND DEFINITIONS');
export const findDefinitionsSuccess = createAction<PanelResults>('FIND DEFINITIONS SUCCESS');
export const findDefinitionsFailed = createAction<Error>('FIND DEFINITIONS ERROR');
