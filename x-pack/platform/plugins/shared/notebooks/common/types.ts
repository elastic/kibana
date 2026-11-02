/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypedLensByValueInput } from '@kbn/lens-common';

export type LensAttributes = TypedLensByValueInput['attributes'];

export type RunMode = 'auto' | 'manual';

export interface TimeRangeValue {
  from: string;
  to: string;
}

export type InputDefinition =
  | { kind: 'time'; defaultValue: TimeRangeValue; pinned?: boolean }
  | { kind: 'dropdown'; optionsQuery: string; defaultValue: string | null }
  | {
      kind: 'range';
      min: number;
      max: number;
      step?: number;
      defaultValue: [number, number] | null;
    };

export type InputKind = InputDefinition['kind'];

interface CellBase {
  id: string;
  name: string;
}

export interface EsqlCellDefinition extends CellBase {
  type: 'esql';
  runMode: RunMode;
  query: string;
}

export interface ChartCellDefinition extends CellBase {
  type: 'chart';
  runMode: RunMode;
  /** Id of the ES|QL cell feeding this chart; null until the user picks a source. */
  sourceCell: string | null;
  /** Null until suggestions have produced a first chart for the source output. */
  lensAttributes: LensAttributes | null;
}

export interface MarkdownCellDefinition extends CellBase {
  type: 'markdown';
  content: string;
}

export interface InputCellDefinition extends CellBase {
  type: 'input';
  input: InputDefinition;
}

export type CellDefinition =
  | EsqlCellDefinition
  | ChartCellDefinition
  | MarkdownCellDefinition
  | InputCellDefinition;

export type CellType = CellDefinition['type'];

export interface NotebookAttributes {
  title: string;
  description?: string;
  cellOrder: string[];
  cells: Record<string, CellDefinition>;
}

export interface NotebookSavedObject {
  id: string;
  attributes: NotebookAttributes;
  updatedAt?: string;
}

export interface NotebookListItem {
  id: string;
  title: string;
  description?: string;
  updatedAt?: string;
}

export interface FindNotebooksResponse {
  total: number;
  notebooks: NotebookListItem[];
}
