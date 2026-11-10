/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { AppMenuConfig, AppMenuPopoverItem } from '@kbn/app-menu';
import { useKibana } from '../../../common/lib/kibana';
import {
  getPackViewDateWindow,
  type DateWindowResult,
} from '../../../common/pack_view_date_window';
import { isScheduledExecution } from '../../../common/is_scheduled_execution';
import { useExportFilters } from '../../../results/export_filters_context';
import { useExportResultsAction } from '../../../results/use_export_results_action';
import { ExportResultsModal } from '../../../results/export_results_modal';
import { EXPORT_NO_DATA_TOOLTIP } from '../../../results/translations';
import { useDiscoverResultsUrl } from '../../../discover/use_discover_results_url';
import { useLensResultsNavigation } from '../../../lens/use_lens_results_navigation';
import { useHasCasesPermissions } from '../../../cases/use_add_to_case_action';
import { AddToCaseActionBridge } from '../../../cases/add_to_case_action_bridge';
import { AddTagsFlyout } from '../../../actions/components/add_tags_flyout';
import type { LiveQueryDetailsItem } from '../../../actions/use_live_query_details';
import { useAddIntegrationsMenuItem } from '../../../common/hooks/use_add_integrations_menu_item';

export interface UseQueryResultsMenuArgs {
  /** Live query action id, or the scheduleId on the scheduled execution details page (the id
   * Add to Case and Add tags attach to). */
  actionId: string;
  data: LiveQueryDetailsItem;
  /** Only provided on live, single-query runs where saving is possible. */
  onSaveQuery?: () => void;
  scheduleId?: string;
  executionCount?: number;
  viewInStartDate?: string;
  viewInEndDate?: string;
  viewInMode?: DateWindowResult['mode'];
}

export interface UseQueryResultsMenuResult {
  menu: AppMenuConfig;
  /** Export-options modal, add-tags flyout and the headless Add to Case bridge; render them
   * alongside the page content. */
  modals: React.ReactNode;
}

const EXPORT_RESULTS_LABEL = i18n.translate('xpack.osquery.exportResults.buttonLabel', {
  defaultMessage: 'Export results',
});

const ADD_TAGS_LABEL = i18n.translate('xpack.osquery.queryDetailsHeader.addTagsLabel', {
  defaultMessage: 'Add tags',
});

const SCHEDULED_TAGS_DISABLED_LABEL = i18n.translate(
  'xpack.osquery.queryDetailsHeader.scheduledTagsDisabledLabel',
  { defaultMessage: 'Tags are not supported for scheduled queries' }
);

const SAVE_QUERY_LABEL = i18n.translate('xpack.osquery.queryDetailsHeader.saveQueryButtonLabel', {
  defaultMessage: 'Save query',
});

const VIEW_IN_LABEL = i18n.translate('xpack.osquery.queryDetailsHeader.viewInLabel', {
  defaultMessage: 'View in',
});

const VIEW_IN_DISCOVER_LABEL = i18n.translate(
  'xpack.osquery.pack.queriesTable.viewDiscoverResultsActionAriaLabel',
  { defaultMessage: 'View in Discover' }
);

const VIEW_IN_LENS_LABEL = i18n.translate(
  'xpack.osquery.pack.queriesTable.viewLensResultsActionAriaLabel',
  { defaultMessage: 'View in Lens' }
);

const ADD_TO_CASE_LABEL = i18n.translate(
  'xpack.osquery.pack.queriesTable.addToCaseResultsActionAriaLabel',
  { defaultMessage: 'Add to Case' }
);

const EMPTY_TAGS: string[] = [];

/**
 * Builds the `AppMenuConfig` for a single-query results header (live or scheduled) and the
 * modal/flyout elements its items open. Reuses the same hooks the previous `HeaderActions`
 * composed from (`useExportResultsAction`, `useDiscoverResultsUrl`, `useLensResultsNavigation`,
 * `useAddToCaseAction`) so the underlying business logic is unchanged — only how it is exposed
 * (menu items instead of rendered buttons) is new.
 */
export const useQueryResultsMenu = ({
  actionId,
  data,
  onSaveQuery,
  scheduleId,
  executionCount,
  viewInStartDate,
  viewInEndDate,
  viewInMode,
}: UseQueryResultsMenuArgs): UseQueryResultsMenuResult => {
  const isScheduled = isScheduledExecution(scheduleId, executionCount);
  const permissions = useKibana().services.application.capabilities.osquery;
  const canEditTags = !!permissions.writeLiveQueries && !!actionId;

  const query = data.queries?.[0];
  const queryActionId = query?.action_id;
  const createdAt = data['@timestamp'];
  const agentIds = data.agents;

  const exportFilters = useExportFilters(queryActionId);

  // Not `data.expiration` — that is `@timestamp + 2 weeks`, which would end the
  // Discover/Lens time picker two weeks in the future.
  const fallbackWindow = useMemo(
    () => getPackViewDateWindow({ isScheduled, timestamp: createdAt }),
    [createdAt, isScheduled]
  );
  const startDate = viewInStartDate ?? fallbackWindow.startDate;
  const endDate = viewInEndDate ?? fallbackWindow.endDate;
  const mode = viewInMode ?? fallbackWindow.mode;

  const exportAction = useExportResultsAction({
    actionId: queryActionId ?? '',
    isLive: !isScheduled,
    liveQueryId: actionId,
    scheduleId,
    executionCount,
    kuery: exportFilters?.kuery,
    activeFilters: exportFilters?.activeFilters,
    filteredTotal: exportFilters?.filteredTotal,
    total: exportFilters?.total,
  });

  const { canDiscover, discoverUrl } = useDiscoverResultsUrl({
    actionId: queryActionId,
    startDate,
    endDate,
    mode,
    scheduleId,
    executionCount,
  });

  const {
    canLens,
    isDisabled: isLensDisabled,
    navigate: navigateToLens,
  } = useLensResultsNavigation({
    actionId: queryActionId,
    startDate,
    endDate,
    mode,
    scheduleId,
    executionCount,
  });

  const hasCasesPermissions = useHasCasesPermissions();
  // Set by `AddToCaseActionBridge` (rendered in `modals`), which owns the lazily loaded cases
  // context; the item stays loading until the bridge has mounted so a click is never a no-op.
  const openAddToCaseRef = useRef<(() => void) | undefined>();
  const [isAddToCaseReady, setIsAddToCaseReady] = useState(false);
  const openAddToCase = useCallback(() => openAddToCaseRef.current?.(), []);

  const addIntegrationsMenuItem = useAddIntegrationsMenuItem();

  const [isTagsFlyoutOpen, setIsTagsFlyoutOpen] = useState(false);
  const openTagsFlyout = useCallback(() => setIsTagsFlyoutOpen(true), []);
  const closeTagsFlyout = useCallback(() => setIsTagsFlyoutOpen(false), []);

  const items = useMemo<NonNullable<AppMenuConfig['items']>>(() => {
    const result: NonNullable<AppMenuConfig['items']> = [];

    if (exportAction.isExportEnabled && queryActionId) {
      result.push({
        id: 'exportResults',
        label: EXPORT_RESULTS_LABEL,
        iconType: 'upload',
        order: 0,
        testId: 'osqueryExportResultsButton',
        isLoading: exportAction.isExporting || exportAction.isInitialLoading,
        disableButton: exportAction.isEmpty,
        tooltipContent: exportAction.isEmpty ? EXPORT_NO_DATA_TOOLTIP : undefined,
        run: exportAction.openModal,
      });
    }

    if (canEditTags) {
      result.push({
        id: 'addTags',
        label: ADD_TAGS_LABEL,
        iconType: 'tag',
        order: 1,
        testId: 'add-tags-button',
        disableButton: isScheduled,
        tooltipContent: isScheduled ? SCHEDULED_TAGS_DISABLED_LABEL : undefined,
        run: openTagsFlyout,
      });
    }

    // The design drops "View in" on scheduled runs, but this page is the only place scheduled pack
    // results can be opened in Discover/Lens, so it stays (agreed with design).
    if (queryActionId && (canDiscover || canLens)) {
      const viewInItems: AppMenuPopoverItem[] = [];

      if (canDiscover) {
        viewInItems.push({
          id: 'viewInDiscover',
          label: VIEW_IN_DISCOVER_LABEL,
          iconType: 'discoverApp',
          href: discoverUrl,
          target: '_blank',
          testId: 'query-details-view-in-discover',
          disableButton: !discoverUrl,
        });
      }

      if (canLens) {
        viewInItems.push({
          id: 'viewInLens',
          label: VIEW_IN_LENS_LABEL,
          iconType: 'lensApp',
          testId: 'query-details-view-in-lens',
          disableButton: isLensDisabled,
          run: navigateToLens,
        });
      }

      result.push({
        id: 'viewIn',
        label: VIEW_IN_LABEL,
        iconType: 'eye',
        order: 2,
        overflow: true,
        items: viewInItems,
        testId: 'query-details-view-in',
      });
    }

    result.push({
      id: 'addToCase',
      label: ADD_TO_CASE_LABEL,
      iconType: 'casesApp',
      order: 3,
      overflow: true,
      disableButton: !hasCasesPermissions,
      isLoading: hasCasesPermissions && !isAddToCaseReady,
      testId: 'query-details-add-to-case',
      run: openAddToCase,
    });

    if (addIntegrationsMenuItem) {
      result.push(addIntegrationsMenuItem);
    }

    return result;
  }, [
    addIntegrationsMenuItem,
    canDiscover,
    canEditTags,
    canLens,
    discoverUrl,
    exportAction,
    hasCasesPermissions,
    isAddToCaseReady,
    isLensDisabled,
    isScheduled,
    openAddToCase,
    navigateToLens,
    openTagsFlyout,
    queryActionId,
  ]);

  const primaryActionItem = useMemo<AppMenuConfig['primaryActionItem']>(() => {
    if (!onSaveQuery) {
      return undefined;
    }

    return {
      id: 'saveQuery',
      label: SAVE_QUERY_LABEL,
      iconType: 'save',
      testId: 'save-query-button',
      run: onSaveQuery,
    };
  }, [onSaveQuery]);

  const menu = useMemo<AppMenuConfig>(
    () => ({ items, primaryActionItem }),
    [items, primaryActionItem]
  );

  const modals = (
    <>
      {exportAction.isModalOpen && (
        <ExportResultsModal
          onClose={exportAction.closeModal}
          onExport={exportAction.handleExport}
          isExporting={exportAction.isExporting}
          hasActiveFilters={exportAction.hasActiveFilters}
          filteredTotal={exportFilters?.filteredTotal}
          total={exportFilters?.total}
        />
      )}
      {isTagsFlyoutOpen && (
        <AddTagsFlyout
          actionId={actionId}
          currentTags={data.tags ?? EMPTY_TAGS}
          onClose={closeTagsFlyout}
        />
      )}
      {hasCasesPermissions && (
        <AddToCaseActionBridge
          openRef={openAddToCaseRef}
          onReadyChange={setIsAddToCaseReady}
          actionId={actionId}
          agentIds={agentIds}
          scheduleId={scheduleId}
          executionCount={executionCount}
        />
      )}
    </>
  );

  return { menu, modals };
};
