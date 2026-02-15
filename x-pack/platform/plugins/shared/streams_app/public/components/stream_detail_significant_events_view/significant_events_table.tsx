/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiLink, EuiConfirmModal } from '@elastic/eui';
import { EuiCodeBlock } from '@elastic/eui';
import { EuiBadge } from '@elastic/eui';
import { EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import type { TickFormatter } from '@elastic/charts';
import type { System, StreamQuery, Streams } from '@kbn/streams-schema';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics/constants';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { StreamSystemDetailsFlyout } from '../stream_detail_systems/stream_systems/stream_system_details_flyout';
import type { SignificantEventItem } from '../../hooks/use_fetch_significant_events';
import { useKibana } from '../../hooks/use_kibana';
import { formatChangePoint } from './utils/change_point';
import { SignificantEventsHistogramChart } from './significant_events_histogram';
import { buildDiscoverParams } from '../significant_events_discovery/utils/discover_helpers';
import { useTimefilter } from '../../hooks/use_timefilter';
import { useStreamSystems } from '../stream_detail_systems/stream_systems/hooks/use_stream_systems';
import { SeverityBadge } from '../significant_events_discovery/components/severity_badge/severity_badge';

export function SignificantEventsTable({
  definition,
  items,
  onDeleteClick,
  onEditClick,
  xFormatter,
  loading,
}: {
  loading?: boolean;
  definition: Streams.all.Definition;
  items: SignificantEventItem[];
  onDeleteClick?: (query: SignificantEventItem) => Promise<void>;
  onEditClick?: (query: SignificantEventItem) => void;
  xFormatter: TickFormatter;
}) {
  const { share } = useKibana().dependencies.start;
  const { timeState } = useTimefilter();

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [selectedDeleteItem, setSelectedDeleteItem] = useState<SignificantEventItem>();
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<System>();
  const { systemsByName, refreshSystems } = useStreamSystems(definition.name);

  const discoverLocator = share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);
  const maxYValue = useMemo(
    () => items.reduce((max, item) => Math.max(max, ...item.occurrences.map(({ y }) => y)), 0),
    [items]
  );

  const columns: Array<EuiBasicTableColumn<SignificantEventItem>> = [
    {
      field: 'title',
      name: i18n.translate('xpack.streams.significantEventsTable.titleColumnTitle', {
        defaultMessage: 'Title',
      }),
      render: (_, record) =>
        discoverLocator ? (
          <EuiLink
            aria-label={i18n.translate('xpack.streams.columns.euiButtonEmpty.openInDiscoverLabel', {
              defaultMessage: 'Open in discover',
            })}
            href={discoverLocator.getRedirectUrl(
              buildDiscoverParams(record.query, definition, timeState)
            )}
            data-test-subj="significant_events_table_discover_link"
          >
            {record.query.title}
          </EuiLink>
        ) : (
          record.query.title
        ),
    },
    {
      field: 'query',
      name: i18n.translate('xpack.streams.significantEventsTable.system', {
        defaultMessage: 'System',
      }),
      render: (query: StreamQuery) => {
        return (
          <EuiBadge
            color="hollow"
            onClickAriaLabel={i18n.translate(
              'xpack.streams.significantEventsTable.systemDetailsFlyoutAriaLabel',
              {
                defaultMessage: 'Open system details',
              }
            )}
            onClick={() => {
              if (query.feature?.name) {
                setSelectedSystem(systemsByName[query.feature.name]);
              }
            }}
            data-test-subj="significant_events_table_system_badge"
          >
            {query.feature?.name ?? '--'}
          </EuiBadge>
        );
      },
    },
    {
      field: 'query',
      name: i18n.translate('xpack.streams.significantEventsTable.queryText', {
        defaultMessage: 'Query',
      }),
      render: (query: StreamQuery) => {
        if (!query.kql.query) {
          return '--';
        }

        return <EuiCodeBlock paddingSize="none">{JSON.stringify(query.kql.query)}</EuiCodeBlock>;
      },
    },
    {
      field: 'query',
      name: i18n.translate('xpack.streams.significantEventsTable.severityColumnTitle', {
        defaultMessage: 'Severity',
      }),
      render: (query: StreamQuery) => {
        return <SeverityBadge score={query.severity_score} />;
      },
    },
    {
      field: 'occurrences',
      name: i18n.translate('xpack.streams.significantEventsTable.occurrencesColumnTitle', {
        defaultMessage: 'Occurrences',
      }),
      render: (_, item) => {
        const change = formatChangePoint(item);

        return (
          <SignificantEventsHistogramChart
            id={item.query.id}
            occurrences={item.occurrences}
            changes={change ? [change] : []}
            xFormatter={xFormatter}
            maxYValue={maxYValue}
          />
        );
      },
    },
    {
      name: i18n.translate('xpack.streams.significantEventsTable.actionsColumnTitle', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          name: i18n.translate('xpack.streams.significantEventsTable.openInDiscoverActionTitle', {
            defaultMessage: 'Open in Discover',
          }),
          type: 'icon',
          icon: 'discoverApp',
          description: i18n.translate(
            'xpack.streams.significantEventsTable.openInDiscoverActionDescription',
            {
              defaultMessage: 'Open query in Discover',
            }
          ),
          enabled: () => discoverLocator !== undefined,
          onClick: (item) => {
            discoverLocator?.navigate(buildDiscoverParams(item.query, definition, timeState));
          },
          isPrimary: true,
          'data-test-subj': 'significant_events_table_open_in_discover_action',
        },
        {
          icon: 'pencil',
          type: 'icon',
          name: i18n.translate('xpack.streams.significantEventsTable.editQueryActionTitle', {
            defaultMessage: 'Edit',
          }),
          description: i18n.translate(
            'xpack.streams.significantEventsTable.editQueryActionDescription',
            {
              defaultMessage: 'Edit query',
            }
          ),
          isPrimary: true,
          onClick: (item) => {
            onEditClick?.(item);
          },
          'data-test-subj': 'significant_events_table_edit_query_action',
        },
        {
          icon: 'trash',
          type: 'icon',
          color: 'danger',
          name: i18n.translate('xpack.streams.significantEventsTable.removeQueryActionTitle', {
            defaultMessage: 'Delete',
          }),
          description: i18n.translate(
            'xpack.streams.significantEventsTable.removeQueryActionDescription',
            {
              defaultMessage: 'Remove query from stream',
            }
          ),
          onClick: (item) => {
            setIsDeleteModalVisible(true);
            setSelectedDeleteItem(item);
          },
        },
      ],
    },
  ];

  return (
    <>
      <EuiBasicTable
        tableCaption={i18n.translate('xpack.streams.significantEventsTable.tableCaption', {
          defaultMessage: 'Significant events',
        })}
        compressed
        items={items}
        rowHeader="title"
        columns={columns}
        loading={loading}
        tableLayout="auto"
        itemId="id"
      />
      {selectedSystem && (
        <StreamSystemDetailsFlyout
          definition={definition}
          system={selectedSystem}
          closeFlyout={() => {
            setSelectedSystem(undefined);
          }}
          refreshSystems={refreshSystems}
        />
      )}
      {isDeleteModalVisible && selectedDeleteItem && (
        <EuiConfirmModal
          data-test-subj="significant_events_table_delete_confirm_modal"
          aria-labelledby={'deleteSignificantModal'}
          title={i18n.translate(
            'xpack.streams.significantEventsTable.euiConfirmModal.deleteSignificantEventLabel',
            {
              defaultMessage: 'Delete significant event {name}',

              values: { name: selectedDeleteItem.query.title },
            }
          )}
          titleProps={{ id: 'deleteSignificantModal' }}
          onCancel={() => setIsDeleteModalVisible(false)}
          onConfirm={() => {
            setIsDeleteLoading(true);
            onDeleteClick?.(selectedDeleteItem).finally(() => {
              setIsDeleteModalVisible(false);
              setSelectedDeleteItem(undefined);
              setIsDeleteLoading(false);
            });
          }}
          cancelButtonText={i18n.translate(
            'xpack.streams.significantEventsTable.euiConfirmModal.cancelButtonLabel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.streams.significantEventsTable.euiConfirmModal.deleteSignificantEventButtonLabel',
            { defaultMessage: 'Delete significant event' }
          )}
          isLoading={isDeleteLoading}
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <p>
            {i18n.translate(
              'xpack.streams.significantEventsTable.euiConfirmModal.deleteSignificantEventMessage',
              {
                defaultMessage:
                  'Are you sure you want to delete the selected significant event? This action cannot be undone.',
              }
            )}
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
}
