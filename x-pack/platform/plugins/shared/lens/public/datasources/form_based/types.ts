/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DragDropIdentifier } from '@kbn/dom-drag-drop';
import type {
  IndexPattern,
  IndexPatternField,
  DragDropOperation,
  GenericIndexPatternColumn,
} from '@kbn/lens-common';

export type DraggedField = DragDropIdentifier & {
  field: IndexPatternField;
  indexPatternId: string;
};

export interface DataViewDragDropOperation extends DragDropOperation {
  dataView: IndexPattern;
  column?: GenericIndexPatternColumn;
}
