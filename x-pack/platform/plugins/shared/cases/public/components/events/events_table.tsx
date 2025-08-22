/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { EuiSkeletonText, EuiSpacer, EuiText, EuiEmptyPrompt } from '@elastic/eui';

import { DataLoadingState, type SortOrder, UnifiedDataTable } from '@kbn/unified-data-table';
import { type DataView } from '@kbn/data-views-plugin/public';

import { CellActionsProvider } from '@kbn/cell-actions';
import type { DataTableRecord } from '@kbn/discover-utils';
import { buildDataTableRecordList } from '@kbn/discover-utils';
import { UnifiedDocViewerFlyout } from '@kbn/unified-doc-viewer-plugin/public';
import { AttachmentType, type EventAttachment } from '../../../common/types/domain';
import type { CaseUI } from '../../../common/ui';
import * as i18n from './translations';
import { useKibana } from '../../common/lib/kibana';
import { useGetEvents } from '../../containers/use_get_events';
import { EVENTS_TABLE } from './translations';

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
  const [columns, setColumns] = useState<string[]>(['_id', 'event.kind', 'host.name']);

  const events = useMemo(
    () =>
      caseData.comments.filter(
        (comment) => comment.type === AttachmentType.event
      ) as unknown as EventAttachment[],
    [caseData.comments]
  );

  const { services } = useKibana();

  const [dataView, setDataView] = useState<DataView>();

  useEffect(() => {
    const createAdhocDataView = async () => {
      const title = events.map((event) => event.index).join(',');

      const adhocDataView = await services.data.dataViews.create({
        title,
      });

      setDataView(adhocDataView);
    };

    createAdhocDataView();
  }, [events, services.data.dataViews, services.fieldFormats]);

  const eventsResponse = useGetEvents(
    caseData.id,
    dataView,
    columns,
    events.flatMap((event) => event.eventId)
  );

  const rows = buildDataTableRecordList({
    records: eventsResponse.data?.rawResponse?.hits?.hits ?? [],
    dataView,
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

  const handleRenderDocumentView = useCallback(() => {
    if (!expandedDoc) {
      return <></>;
    }

    if (!dataView) {
      return <></>;
    }

    return (
      <UnifiedDocViewerFlyout
        onClose={handleCloseFlyout}
        columns={columns}
        onRemoveColumn={handleRemoveColumn}
        setExpandedDoc={setExpandedDoc}
        dataView={dataView}
        isEsqlQuery={false}
        hit={expandedDoc}
        services={services}
        onAddColumn={handleAddColumn}
      />
    );
  }, [
    columns,
    dataView,
    expandedDoc,
    handleAddColumn,
    handleCloseFlyout,
    handleRemoveColumn,
    services,
  ]);

  return !dataView || eventsResponse.isFetching ? (
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
      <CellActionsProvider
        getTriggerCompatibleActions={services.uiActions.getTriggerCompatibleActions}
      >
        <UnifiedDataTable
          onSetColumns={setColumns}
          visibleCellActions={3}
          dataView={dataView}
          sampleSizeState={1000}
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
          rows={rows}
        />
      </CellActionsProvider>
    </>
  );
};

EventsTable.displayName = 'EventsTable';
