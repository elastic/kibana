/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { SymbolInformation } from 'vscode-languageserver-types/lib/esm/main';

export interface SymbolsPayload {
  path: string;
  data: SymbolInformation[];
  structureTree: any;
}

export const loadStructure = createAction<string>('LOAD STRUCTURE');
export const loadStructureSuccess = createAction<SymbolsPayload>('LOAD STRUCTURE SUCCESS');
export const loadStructureFailed = createAction<Error>('LOAD STRUCTURE FAILED');

export const openSymbolPath = createAction<string>('OPEN SYMBOL PATH');
export const closeSymbolPath = createAction<string>('CLOSE SYMBOL PATH');
