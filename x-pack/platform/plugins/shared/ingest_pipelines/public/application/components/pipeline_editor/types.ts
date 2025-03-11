/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch } from 'react';
import { OnFormUpdateArg } from '../../../shared_imports';
import { SerializeResult } from './serialize';
import { OnActionHandler, ProcessorInfo } from './components';
import { ProcessorsDispatch, State as ProcessorsReducerState } from './processors_reducer';

/**
 * An array of keys that map to a value in an object
 * structure.
 *
 * For instance:
 * ['a', 'b', '0', 'c'] given { a: { b: [ { c: [] } ] } } => []
 *
 * Additionally, an empty selector `[]`, is a special indicator
 * for the root level.
 */
export type ProcessorSelector = string[];

/** @private */
export interface ProcessorInternal<CustomProcessorOptions = {}> {
  id: string;
  type: string;
  options: { [key: string]: any };
  onFailure?: ProcessorInternal[];
}

export type { OnFormUpdateArg };

export interface FormValidityState {
  validate: OnFormUpdateArg<any>['validate'];
}

export interface OnUpdateHandlerArg extends FormValidityState {
  getData: () => SerializeResult;
}

export type OnUpdateHandler = (arg: OnUpdateHandlerArg) => void;

/**
 * The editor can be in different modes. This enables us to hold
 * a reference to data dispatch to the reducer (like the {@link ProcessorSelector}
 * which will be used to update the in-memory processors data structure.
 */
export type EditorMode =
  | { id: 'creatingProcessor'; arg: { selector: ProcessorSelector } }
  | { id: 'movingProcessor'; arg: ProcessorInfo }
  | { id: 'managingProcessor'; arg: { processor: ProcessorInternal; selector: ProcessorSelector } }
  | { id: 'removingProcessor'; arg: { selector: ProcessorSelector } }
  | { id: 'idle' };

export interface ContextValueEditor {
  mode: EditorMode;
  setMode: Dispatch<EditorMode>;
}

export interface ContextValueProcessors {
  state: ProcessorsReducerState;
  dispatch: ProcessorsDispatch;
}

export interface ContextValueState {
  processors: ContextValueProcessors;
  editor: ContextValueEditor;
}

export interface ContextValue {
  onTreeAction: OnActionHandler;
  state: ContextValueState;
}

export interface Document {
  _id: string;
  [key: string]: any;
}

export type ProcessorStatus =
  | 'success'
  | 'error'
  | 'error_ignored'
  | 'dropped'
  | 'skipped'
  | 'inactive';

export interface ProcessorResult {
  processor_type: string;
  status: ProcessorStatus;
  doc?: Document;
  tag: string;
  ignored_error?: any;
  error?: any;
  processorInput?: Document;
  [key: string]: any;
}

export interface ProcessorResults {
  processor_results: ProcessorResult[];
}

export interface VerboseTestOutput {
  docs: ProcessorResults[];
}
