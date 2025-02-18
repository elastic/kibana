/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { LogColumn, LogEntry } from '../../../../common/log_entry';
import { TextScale } from '../../../../common/log_text_scale';
import {
  LogColumnRenderConfiguration,
  isFieldColumnRenderConfiguration,
  isMessageColumnRenderConfiguration,
  isTimestampColumnRenderConfiguration,
} from '../../../utils/log_column_render_configuration';
import { isTimestampColumn } from '../../../utils/log_entry';
import { useUiTracker } from '../../../utils/use_ui_tracker';
import { LogEntryColumn, LogEntryColumnWidths, iconColumnId } from './log_entry_column';
import { LogEntryContextMenu } from './log_entry_context_menu';
import { LogEntryFieldColumn } from './log_entry_field_column';
import { LogEntryMessageColumn } from './log_entry_message_column';
import { LogEntryRowWrapper } from './log_entry_row_wrapper';
import { LogEntryTimestampColumn } from './log_entry_timestamp_column';

const MENU_LABEL = i18n.translate('xpack.logsShared.logEntryItemView.logEntryActionsMenuToolTip', {
  defaultMessage: 'View actions for line',
});

const LOG_DETAILS_LABEL = i18n.translate('xpack.logsShared.logs.logEntryActionsDetailsButton', {
  defaultMessage: 'View details',
});

const LOG_VIEW_IN_CONTEXT_LABEL = i18n.translate(
  'xpack.logsShared.lobs.logEntryActionsViewInContextButton',
  {
    defaultMessage: 'View in context',
  }
);

interface LogEntryRowProps {
  boundingBoxRef?: React.Ref<Element>;
  columnConfigurations: LogColumnRenderConfiguration[];
  columnWidths: LogEntryColumnWidths;
  highlights: LogEntry[];
  isActiveHighlight: boolean;
  isHighlighted: boolean;
  logEntry: LogEntry;
  openFlyoutWithItem?: (id: string) => void;
  openViewLogInContext?: (entry: LogEntry) => void;
  scale: TextScale;
  wrap: boolean;
}

export const LogEntryRow = memo(
  ({
    boundingBoxRef,
    columnConfigurations,
    columnWidths,
    highlights,
    isActiveHighlight,
    isHighlighted,
    logEntry,
    openFlyoutWithItem,
    openViewLogInContext,
    scale,
    wrap,
  }: LogEntryRowProps) => {
    const trackMetric = useUiTracker();

    const [isHovered, setIsHovered] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const openMenu = useCallback(() => setIsMenuOpen(true), []);
    const closeMenu = useCallback(() => setIsMenuOpen(false), []);

    const setItemIsHovered = useCallback(() => setIsHovered(true), []);
    const setItemIsNotHovered = useCallback(() => setIsHovered(false), []);
    const openFlyout = useCallback(
      () => openFlyoutWithItem?.(logEntry.id),
      [openFlyoutWithItem, logEntry.id]
    );

    const handleOpenViewLogInContext = useCallback(() => {
      openViewLogInContext?.(logEntry);
      trackMetric({ metric: 'view_in_context__stream' });
    }, [openViewLogInContext, logEntry, trackMetric]);

    const hasContext = useMemo(() => !isEmpty(logEntry.context), [logEntry]);
    const hasActionFlyoutWithItem = openFlyoutWithItem !== undefined;
    const hasActionViewLogInContext = hasContext && openViewLogInContext !== undefined;
    const hasActionsMenu = hasActionFlyoutWithItem || hasActionViewLogInContext;

    const menuItems = useMemo(() => {
      const items = [];
      if (hasActionFlyoutWithItem) {
        items.push({
          label: LOG_DETAILS_LABEL,
          onClick: openFlyout,
        });
      }
      if (hasActionViewLogInContext) {
        items.push({
          label: LOG_VIEW_IN_CONTEXT_LABEL,
          onClick: handleOpenViewLogInContext,
        });
      }

      return items;
    }, [
      hasActionFlyoutWithItem,
      hasActionViewLogInContext,
      openFlyout,
      handleOpenViewLogInContext,
    ]);

    const logEntryColumnsById = useMemo(
      () =>
        logEntry.columns.reduce<{
          [columnId: string]: LogEntry['columns'][0];
        }>(
          (columnsById, column) => ({
            ...columnsById,
            [column.columnId]: column,
          }),
          {}
        ),
      [logEntry.columns]
    );

    const highlightsByColumnId = useMemo(
      () =>
        highlights.reduce<{
          [columnId: string]: LogColumn[];
        }>(
          (columnsById, highlight) =>
            highlight.columns.reduce(
              (innerColumnsById, column) => ({
                ...innerColumnsById,
                [column.columnId]: [...(innerColumnsById[column.columnId] || []), column],
              }),
              columnsById
            ),
          {}
        ),
      [highlights]
    );

    return (
      <LogEntryRowWrapper
        data-test-subj="streamEntry logTextStreamEntry"
        ref={
          /* Workaround for missing RefObject support in styled-components */
          boundingBoxRef as any
        }
        onMouseEnter={setItemIsHovered}
        onMouseLeave={setItemIsNotHovered}
        isHighlighted={isHighlighted}
        scale={scale}
      >
        {columnConfigurations.map((columnConfiguration) => {
          if (isTimestampColumnRenderConfiguration(columnConfiguration)) {
            const column = logEntryColumnsById[columnConfiguration.timestampColumn.id];
            const columnWidth = columnWidths[columnConfiguration.timestampColumn.id];

            return (
              <LogEntryColumn
                data-test-subj="logColumn timestampLogColumn"
                key={columnConfiguration.timestampColumn.id}
                {...columnWidth}
              >
                {isTimestampColumn(column) ? (
                  <LogEntryTimestampColumn
                    time={column.time}
                    render={columnConfiguration.timestampColumn.render}
                  />
                ) : null}
              </LogEntryColumn>
            );
          } else if (isMessageColumnRenderConfiguration(columnConfiguration)) {
            const column = logEntryColumnsById[columnConfiguration.messageColumn.id];
            const columnWidth = columnWidths[columnConfiguration.messageColumn.id];

            return (
              <LogEntryColumn
                data-test-subj="logColumn messageLogColumn"
                key={columnConfiguration.messageColumn.id}
                {...columnWidth}
              >
                {column ? (
                  <LogEntryMessageColumn
                    columnValue={column}
                    highlights={highlightsByColumnId[column.columnId] || []}
                    isActiveHighlight={isActiveHighlight}
                    wrapMode={wrap ? 'long' : 'pre-wrapped'}
                    render={columnConfiguration.messageColumn.render}
                  />
                ) : null}
              </LogEntryColumn>
            );
          } else if (isFieldColumnRenderConfiguration(columnConfiguration)) {
            const column = logEntryColumnsById[columnConfiguration.fieldColumn.id];
            const columnWidth = columnWidths[columnConfiguration.fieldColumn.id];

            return (
              <LogEntryColumn
                data-test-subj={`logColumn fieldLogColumn fieldLogColumn:${columnConfiguration.fieldColumn.field}`}
                key={columnConfiguration.fieldColumn.id}
                {...columnWidth}
              >
                {column ? (
                  <LogEntryFieldColumn
                    columnValue={column}
                    highlights={highlightsByColumnId[column.columnId] || []}
                    isActiveHighlight={isActiveHighlight}
                    wrapMode={wrap ? 'long' : 'pre-wrapped'}
                    render={columnConfiguration.fieldColumn.render}
                  />
                ) : null}
              </LogEntryColumn>
            );
          }
        })}
        {hasActionsMenu ? (
          <LogEntryColumn
            key="logColumn iconLogColumn iconLogColumn:details"
            {...columnWidths[iconColumnId]}
          >
            {isHovered || isMenuOpen ? (
              <LogEntryContextMenu
                aria-label={MENU_LABEL}
                isOpen={isMenuOpen}
                onOpen={openMenu}
                onClose={closeMenu}
                items={menuItems}
              />
            ) : null}
          </LogEntryColumn>
        ) : null}
      </LogEntryRowWrapper>
    );
  }
);

// eslint-disable-next-line import/no-default-export
export default LogEntryRow;
