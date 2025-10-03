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
import React, { useState } from 'react';
import type { TickFormatter } from '@elastic/charts';
import type { StreamQuery, Streams } from '@kbn/streams-schema';
import { StreamSystemDetailsFlyout } from '../data_management/stream_detail_management/stream_systems/stream_system_details_flyout';
import type { SignificantEventItem } from '../../hooks/use_fetch_significant_events';
import { useKibana } from '../../hooks/use_kibana';
import { formatChangePoint } from './utils/change_point';
import { SignificantEventsHistogramChart } from './significant_events_histogram';
import { buildDiscoverParams } from './utils/discover_helpers';
import { useTimefilter } from '../../hooks/use_timefilter';

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
  const {
    dependencies: {
      start: { discover },
    },
  } = useKibana();
  const { timeState } = useTimefilter();

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [selectedDeleteItem, setSelectedDeleteItem] = useState<SignificantEventItem>();
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const [isSystemDetailFlyoutOpen, setIsSystemDetailFlyoutOpen] = useState<string>('');

  const columns: Array<EuiBasicTableColumn<SignificantEventItem>> = [
    {
      field: 'title',
      name: i18n.translate('xpack.streams.significantEventsTable.titleColumnTitle', {
        defaultMessage: 'Title',
      }),
      render: (_, record) => (
        <EuiLink
          aria-label={i18n.translate('xpack.streams.columns.euiButtonEmpty.openInDiscoverLabel', {
            defaultMessage: 'Open in discover',
          })}
          href={discover?.locator?.getRedirectUrl(
            buildDiscoverParams(record.query, definition, timeState)
          )}
        >
          {record.query.title}
        </EuiLink>
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
              if (query.system?.name) {
                setIsSystemDetailFlyoutOpen(query.system.name);
              }
            }}
            iconOnClick={() => {
              if (query.system?.name) {
                setIsSystemDetailFlyoutOpen(query.system.name);
              }
            }}
            iconOnClickAriaLabel={i18n.translate(
              'xpack.streams.significantEventsTable.systemDetailsFlyoutAriaLabel',
              {
                defaultMessage: 'Open system details',
              }
            )}
          >
            {query.system?.name ?? '--'}
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
            change={change}
            xFormatter={xFormatter}
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
          onClick: (item) => {
            const url = discover?.locator?.getRedirectUrl(
              buildDiscoverParams(item.query, definition, timeState)
            );
            window.open(url, '_blank');
          },
          isPrimary: true,
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
      {isSystemDetailFlyoutOpen && (
        <StreamSystemDetailsFlyout
          definition={definition}
          systemName={isSystemDetailFlyoutOpen}
          closeFlyout={() => {
            setIsSystemDetailFlyoutOpen('');
          }}
        />
      )}
      {isDeleteModalVisible && selectedDeleteItem && (
        <EuiConfirmModal
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
