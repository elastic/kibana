/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useCallback, useMemo, useState } from 'react';

import { EuiSkeletonText, EuiSpacer, EuiText, EuiEmptyPrompt } from '@elastic/eui';

import { DataLoadingState, type SortOrder, UnifiedDataTable } from '@kbn/unified-data-table';

import { CellActionsProvider } from '@kbn/cell-actions';
import type { DataTableRecord } from '@kbn/discover-utils';
import { UnifiedDocViewerFlyout } from '@kbn/unified-doc-viewer-plugin/public';
import { AttachmentType, type EventAttachment } from '../../../common/types/domain';
import type { CaseUI } from '../../../common/ui';
import * as i18n from './translations';
import { useKibana } from '../../common/lib/kibana';
import { useGetEvents } from '../../containers/use_get_events';
import { EVENTS_TABLE } from './translations';
import { useEventsDataView } from './use_events_data_view';
import { useGetActions } from './use_get_actions';

const defaultSort: SortOrder[] = [];

const EmptyEventsTable: FC<{ caseData: CaseUI }> = () => (
  <EuiEmptyPrompt
    title={<h3>{i18n.NO_EVENTS}</h3>}
    data-test-subj="cases-events-table-empty"
    titleSize="xs"
  />
);

EmptyEventsTable.displayName = 'EmptyEventsTable';

export interface EventsTableProps {
  caseData: CaseUI;
}

export const EventsTable = ({ caseData }: EventsTableProps) => {
  const { services } = useKibana();
  const [columns, setColumns] = useState<string[]>(['_id', 'event.kind', 'host.name']);

  const events = useMemo(
    () =>
      caseData.comments.filter(
        (comment) => comment.type === AttachmentType.event
      ) as unknown as EventAttachment[],
    [caseData.comments]
  );

  const indexPattern = events.map((event) => event.index).join(',');
  const { dataView: eventsDataView } = useEventsDataView(indexPattern);

  const eventsResponse = useGetEvents(eventsDataView, {
    caseId: caseData.id,
    columns,
    eventIds: events.flatMap((event) => event.eventId),
  });

  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord>();

  const handleRemoveColumn = useCallback(
    (column: string): void =>
      setColumns((previousColumns) =>
        previousColumns.filter((previousColumn) => previousColumn !== column)
      ),
    []
  );

  const handleCloseFlyout = useCallback(() => setExpandedDoc(undefined), []);

  const handleAddColumn = useCallback(
    (column: string): void => setColumns((previousColumns) => [...previousColumns, column]),
    []
  );

  const getTriggerCompatibleActions = useGetActions();

  const handleRenderDocumentView = useCallback(() => {
    if (!expandedDoc) {
      return <></>;
    }

    if (!eventsDataView) {
      return <></>;
    }

    return (
      <UnifiedDocViewerFlyout
        onClose={handleCloseFlyout}
        columns={columns}
        onRemoveColumn={handleRemoveColumn}
        setExpandedDoc={setExpandedDoc}
        dataView={eventsDataView}
        isEsqlQuery={false}
        hit={expandedDoc}
        services={services}
        onAddColumn={handleAddColumn}
      />
    );
  }, [
    columns,
    eventsDataView,
    expandedDoc,
    handleAddColumn,
    handleCloseFlyout,
    handleRemoveColumn,
    services,
  ]);

  return !eventsDataView || eventsResponse.isFetching ? (
    <>
      <EuiSpacer size="l" />
      <EuiSkeletonText data-test-subj="cases-events-table-loading" lines={10} />
    </>
  ) : (
    <>
      {events.length > 0 && (
        <>
          <EuiSpacer size="xl" />
          <EuiText size="xs" color="subdued" data-test-subj="cases-events-table-results-count">
            {i18n.SHOWING_EVENTS(events.length)}
          </EuiText>
        </>
      )}
      <EuiSpacer size="s" />
      <CellActionsProvider getTriggerCompatibleActions={getTriggerCompatibleActions}>
        <UnifiedDataTable
          consumer="cases"
          onSetColumns={setColumns}
          dataView={eventsDataView}
          sampleSizeState={events.length}
          ariaLabelledBy={EVENTS_TABLE}
          loadingState={DataLoadingState.loaded}
          showTimeCol={true}
          columns={columns}
          sort={defaultSort}
          isSortEnabled={false}
          isPaginationEnabled={false}
          services={services}
          setExpandedDoc={setExpandedDoc}
          expandedDoc={expandedDoc}
          renderDocumentView={handleRenderDocumentView}
          rows={eventsResponse.data}
        />
      </CellActionsProvider>
    </>
  );
};

EventsTable.displayName = 'EventsTable';
