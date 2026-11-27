/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderBack, AppHeaderMetadataItems } from '@kbn/app-header';
import type { DateWindowResult } from '../../../common/pack_view_date_window';
import type { LiveQueryDetailsItem } from '../../../actions/use_live_query_details';
import { useQueryResultsMenu } from './use_query_results_menu';

export interface QueryResultsAppHeaderProps {
  /** Live query action id, or the scheduleId on the scheduled execution details page. */
  actionId: string;
  data: LiveQueryDetailsItem;
  title: string;
  back: AppHeaderBack;
  metadata?: AppHeaderMetadataItems;
  docLink: string;
  /** Only provided on live, single-query runs where saving is possible. */
  onSaveQuery?: () => void;
  scheduleId?: string;
  executionCount?: number;
  viewInStartDate?: string;
  viewInEndDate?: string;
  viewInMode?: DateWindowResult['mode'];
}

/**
 * Single-query results header: builds the menu/modals via `useQueryResultsMenu` and renders the
 * `AppHeader` plus its export-options modal, add-tags flyout and Add to Case bridge.
 *
 * Must be mounted under the same `ExportFiltersProvider` as `ResultTabs` so "Export results"
 * sees the table's totals and filters. Only render once `data` exists.
 */
export const QueryResultsAppHeader: React.FC<QueryResultsAppHeaderProps> = ({
  actionId,
  data,
  title,
  back,
  metadata,
  docLink,
  onSaveQuery,
  scheduleId,
  executionCount,
  viewInStartDate,
  viewInEndDate,
  viewInMode,
}) => {
  const { menu, modals } = useQueryResultsMenu({
    actionId,
    data,
    onSaveQuery,
    scheduleId,
    executionCount,
    viewInStartDate,
    viewInEndDate,
    viewInMode,
  });

  return (
    <>
      <AppHeader title={title} back={back} metadata={metadata} menu={menu} docLink={docLink} />
      {modals}
    </>
  );
};
