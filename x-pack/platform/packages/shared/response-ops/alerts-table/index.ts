/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertsTable } from './components/alerts_table';
export { AlertsTable } from './components/alerts_table';
export {
  ALERT_CLOSING_REASON_PANEL_ID,
  useBulkClosingReasonItems,
} from './components/closing_reason/use_bulk_closing_reason_items';
export type {
  OnSubmitClosingReasonParams,
  UseBulkClosingReasonItemsProps,
} from './components/closing_reason/use_bulk_closing_reason_items';
// Lazy load helper
// eslint-disable-next-line import/no-default-export
export default AlertsTable;
