/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { ChangeHistoryCompareSpec } from './change_history_compare';
import type { ChangeHistoryDiffTelemetry } from './change_history_diff_telemetry';
import type { ChangeHistoryDetail } from './change_history_detail';

/** Renders a read-only preview of a historical change (e.g. JSON document, text, structured definition). */
export type ChangeHistoryPreviewRenderFn = (props: {
  change: ChangeHistoryDetail;
  objectId: string;
  compareSpec?: ChangeHistoryCompareSpec;
  isLoadingCompareContext?: boolean;
  diffTelemetry?: ChangeHistoryDiffTelemetry;
}) => ReactNode;
