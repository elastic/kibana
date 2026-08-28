/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryListItem } from '../types/change_history_list_item';
import { getRestoreVersionLabel } from './get_restore_version_label';

/** Resolves the newest committed row (with `object.sequence`) for restore telemetry. */
export const findCommittedChangeHistoryListItem = (
  items: ChangeHistoryListItem[]
): ChangeHistoryListItem | undefined =>
  items.find((item) => getRestoreVersionLabel(item) !== undefined);
