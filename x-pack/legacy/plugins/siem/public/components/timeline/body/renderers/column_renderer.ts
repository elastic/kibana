/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimelineNonEcsData } from '../../../../graphql/types';
import { ColumnHeader } from '../column_headers/column_header';

export interface ColumnRenderer {
  isInstance: (columnName: string, data: TimelineNonEcsData[]) => boolean;
  renderColumn: ({
    columnName,
    eventId,
    field,
    timelineId,
    truncate,
    values,
  }: {
    columnName: string;
    eventId: string;
    field: ColumnHeader;
    timelineId: string;
    truncate?: boolean;
    values: string[] | null | undefined;
  }) => React.ReactNode;
}
