/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BrowserFields } from '../../containers/source';
import { ColumnHeaderOptions } from '../../store/timeline/model';
import { OnUpdateColumns } from '../timeline/events';

export type OnFieldSelected = (fieldId: string) => void;
export type OnHideFieldBrowser = () => void;

export interface FieldBrowserProps {
  /** The timeline's current column headers */
  columnHeaders: ColumnHeaderOptions[];
  /** A map of categoryId -> metadata about the fields in that category */
  browserFields: BrowserFields;
  /** The height of the field browser */
  height: number;
  /** When true, this Fields Browser is being used as an "events viewer" */
  isEventViewer?: boolean;
  /**
   * Overrides the default behavior of the `FieldBrowser` to enable
   * "selection" mode, where a field is selected by clicking a button
   * instead of dragging it to the timeline
   */
  onFieldSelected?: OnFieldSelected;
  /** Invoked when a user chooses to view a new set of columns in the timeline */
  onUpdateColumns: OnUpdateColumns;
  /** The timeline associated with this field browser */
  timelineId: string;
  /** Adds or removes a column to / from the timeline */
  toggleColumn: (column: ColumnHeaderOptions) => void;
  /** The width of the field browser */
  width: number;
}
