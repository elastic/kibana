/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';

import { EuiSkeletonText, EuiSpacer, EuiText, EuiEmptyPrompt } from '@elastic/eui';

import { UnifiedDataTable } from '@kbn/unified-data-table';
import { DataView } from '@kbn/data-views-plugin/public';

import { CellActionsProvider } from '@kbn/cell-actions';
import type { DataTableRecord } from '@kbn/discover-utils';
import { buildDataTableRecordList } from '@kbn/discover-utils';
import { UnifiedDocViewerFlyout } from '@kbn/unified-doc-viewer-plugin/public';
import { AttachmentType, type EventAttachment } from '../../../common/types/domain';
import type { CaseUI } from '../../../common/ui';
import * as i18n from './translations';
import { useKibana } from '../../common/lib/kibana';
import { useGetEvents } from '../../containers/use_get_events';

const EmptyComponent = () => <></>;
EmptyComponent.displayName = 'EmptyComponent';

const EmptyEventsTable = ({ caseData }: { caseData: CaseUI }) => (
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

const columns = ['_id', 'event.kind', 'host.name'];
export const EventsTable = ({ caseData }: EventsTableProps) => {
  const filesTableRowProps = useCallback(
    (event: EventAttachment) => ({
      'data-test-subj': `cases-events-table-row-${event.eventId}`,
    }),
    []
  );

  const events = useMemo(
    () =>
      caseData.comments.filter(
        (comment) => comment.type === AttachmentType.event
      ) as unknown as EventAttachment[],
    [caseData.comments]
  );

  const { services } = useKibana();

  const dataView = useMemo(() => {
    const title = events.map((event) => event.index).join(',');

    return new DataView({
      fieldFormats: services.fieldFormats,
      spec: {
        title,
        id: 'adhoc_case_events',
      },
    });
  }, [events, services.fieldFormats]);

  const eventsResponse = useGetEvents(
    caseData.id,
    dataView.getIndexPattern().split(','),
    columns,
    events.flatMap((event) => event.eventId)
  );

  const rows = buildDataTableRecordList({
    records: eventsResponse.data?.rawResponse?.hits?.hits ?? [],
    dataView,
  });

  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord>();

  const handleRenderDocumentView = useCallback(() => {
    if (!expandedDoc) {
      return <></>;
    }

    return (
      <UnifiedDocViewerFlyout
        onClose={() => setExpandedDoc(undefined)}
        columns={[]}
        dataView={dataView}
        isEsqlQuery={false}
        hit={expandedDoc}
        services={services}
      />
    );
  }, [dataView, expandedDoc, services]);

  return eventsResponse.isFetching ? (
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
          visibleCellActions={3}
          dataView={dataView}
          columns={columns}
          sort={[]}
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
