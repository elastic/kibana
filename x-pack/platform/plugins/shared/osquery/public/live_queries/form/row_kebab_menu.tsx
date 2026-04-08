/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useState, useMemo } from 'react';
import { EuiButtonIcon, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AddToCaseContextProvider } from '../../cases/add_to_cases';
import { AddToCaseButton } from '../../cases/add_to_cases_button';
import { CasesAttachmentWrapperContext } from '../../shared_components/attachments/pack_queries_attachment_wrapper';
import { AddToTimelineButton } from '../../timelines/add_to_timeline_button';
import { useIsExperimentalFeatureEnabled } from '../../common/experimental_features_context';
import { useExportResults } from '../../results/use_export_results';
import { ExportResultsModal } from '../../results/export_results_modal';
import { useExportFiltersContext } from '../../results/export_filters_context';
import type { ExportFormat } from '../../results/use_export_results';
import type { AddToTimelineHandler } from '../../types';

interface RowKebabMenuProps {
  row: { action_id?: string; id?: string };
  actionId: string | undefined;
  agentIds?: string[];
  addToTimeline?: AddToTimelineHandler;
  scheduleId?: string;
  executionCount?: number;
}

const RowKebabMenuContent: React.FC<RowKebabMenuProps> = React.memo(
  ({ row, actionId, agentIds, addToTimeline, scheduleId, executionCount }) => {
    const isCasesAttachment = useContext(CasesAttachmentWrapperContext);
    const isExportEnabled = useIsExperimentalFeatureEnabled('exportResults');
    const exportFiltersCtx = useExportFiltersContext();
    const [isOpen, setIsOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

    // Read filters from the results table context (if the row is expanded)
    const rowActionId = row.action_id ?? '';
    const exportFilters = exportFiltersCtx?.getFilters(rowActionId);
    const hasActiveFilters = !!(
      exportFilters?.kuery ||
      (exportFilters?.activeFilters && exportFilters.activeFilters.length > 0)
    );

    const esFilters = useMemo(
      () =>
        exportFilters?.activeFilters && exportFilters.activeFilters.length > 0
          ? JSON.stringify(exportFilters.activeFilters)
          : undefined,
      [exportFilters?.activeFilters]
    );

    const { exportResults, isExporting } = useExportResults({
      actionId: rowActionId,
      isLive: !scheduleId,
      scheduleId,
      executionCount,
    });

    const openExportModal = useCallback(() => {
      close();
      setIsExportModalOpen(true);
    }, [close]);

    const closeExportModal = useCallback(() => {
      setIsExportModalOpen(false);
    }, []);

    const handleExport = useCallback(
      (format: ExportFormat, options: { filtered: boolean }) => {
        closeExportModal();
        exportResults(
          format,
          options.filtered ? { kuery: exportFilters?.kuery, esFilters } : undefined
        );
      },
      [closeExportModal, exportResults, exportFilters?.kuery, esFilters]
    );

    const kebabLabel = i18n.translate(
      'xpack.osquery.pack.queriesTable.viewResultsMoreActionsAriaLabel',
      { defaultMessage: 'More actions' }
    );

    const menuItems = useMemo(
      () => [
        ...(row.action_id
          ? [
              <AddToTimelineButton
                key="timeline"
                field="action_id"
                value={row.action_id}
                addToTimeline={addToTimeline}
                displayAsMenuItem
                onMenuItemClick={close}
              />,
            ]
          : []),
        ...(!isCasesAttachment && actionId
          ? [
              <AddToCaseButton
                key="case"
                actionId={actionId}
                agentIds={agentIds}
                queryId={row.action_id}
                isIcon={false}
                isDisabled={!row.action_id}
                scheduleId={scheduleId}
                executionCount={executionCount}
                displayAsMenuItem
                onMenuItemClick={close}
              />,
            ]
          : []),
        ...(isExportEnabled && row.action_id
          ? [
              <EuiContextMenuItem
                key="export"
                icon="exportAction"
                onClick={openExportModal}
                data-test-subj="osqueryExportResultsMenuItem"
              >
                {i18n.translate('xpack.osquery.kebab.exportResults', {
                  defaultMessage: 'Export results',
                })}
              </EuiContextMenuItem>,
            ]
          : []),
      ],
      [
        isCasesAttachment,
        isExportEnabled,
        row.action_id,
        actionId,
        agentIds,
        addToTimeline,
        scheduleId,
        executionCount,
        close,
        openExportModal,
      ]
    );

    if (menuItems.length === 0) return null;

    return (
      <>
        <EuiPopover
          button={
            <EuiButtonIcon
              iconType="boxesVertical"
              aria-label={kebabLabel}
              onClick={toggle}
              data-test-subj={`packQueriesTableKebab-${row.id ?? row.action_id}`}
            />
          }
          isOpen={isOpen}
          closePopover={close}
          panelPaddingSize="none"
          anchorPosition="downLeft"
        >
          <EuiContextMenuPanel size="s" items={menuItems} />
        </EuiPopover>

        {isExportModalOpen && (
          <ExportResultsModal
            onClose={closeExportModal}
            onExport={handleExport}
            isExporting={isExporting}
            hasActiveFilters={hasActiveFilters}
            filteredTotal={exportFilters?.filteredTotal}
          />
        )}
      </>
    );
  }
);

RowKebabMenuContent.displayName = 'RowKebabMenuContent';

/**
 * Wraps CasesContext above the popover so the case selector modal
 * survives when the popover closes and unmounts its content.
 */
export const RowKebabMenu: React.FC<RowKebabMenuProps> = React.memo((props) => {
  if (!props.actionId && !props.scheduleId) {
    return <RowKebabMenuContent {...props} />;
  }

  return (
    <AddToCaseContextProvider>
      <RowKebabMenuContent {...props} />
    </AddToCaseContextProvider>
  );
});

RowKebabMenu.displayName = 'RowKebabMenu';
