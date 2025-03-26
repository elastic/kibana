/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBasicTable, EuiBasicTableColumn, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AbortableAsyncState } from '@kbn/react-hooks';
import React, { useMemo, useState } from 'react';
import { TickFormatter } from '@elastic/charts';
import { SignificantEventItem } from '../../hooks/use_fetch_significant_events';
import { useKibana } from '../../hooks/use_kibana';
import { formatChangePoint } from './change_point';
import { ChangePointSummary } from './change_point_summary';
import { SignificantEventsHistogramChart } from './significant_events_histogram';
import { buildDiscoverParams } from './utils/discover_helpers';

export function SignificantEventsTable({
  name,
  response,
  onDeleteClick,
  onEditClick,
  xFormatter,
}: {
  name?: string;
  response: Pick<AbortableAsyncState<SignificantEventItem[]>, 'value' | 'loading' | 'error'>;
  onDeleteClick?: (query: SignificantEventItem) => void;
  onEditClick?: (query: SignificantEventItem) => void;
  xFormatter: TickFormatter;
}) {
  const {
    dependencies: {
      start: { discover },
    },
  } = useKibana();

  const items = useMemo(() => {
    return response.value ?? [];
  }, [response.value]);

  const [isLoading, setIsLoading] = useState(false);

  const columns: Array<EuiBasicTableColumn<SignificantEventItem>> = [
    {
      field: 'title',
      name: i18n.translate('xpack.streams.significantEventsTable.titleColumnTitle', {
        defaultMessage: 'Title',
      }),
      render: (_, record) => (
        <EuiLink
          target="_blank"
          href={discover?.locator?.getRedirectUrl(buildDiscoverParams(record, name))}
        >
          {record.query.title}
        </EuiLink>
      ),
    },
    {
      field: 'change',
      name: i18n.translate('xpack.streams.significantEventsTable.changeColumnTitle', {
        defaultMessage: 'Change',
      }),
      render: (_, item) => {
        const change = formatChangePoint(item);
        return <ChangePointSummary change={change} xFormatter={xFormatter} />;
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
          name: i18n.translate('xpack.streams.significantEventsTable.editQueryActionTitle', {
            defaultMessage: 'Edit',
          }),
          description: i18n.translate(
            'xpack.streams.significantEventsTable.editQueryActionDescription',
            {
              defaultMessage: 'Edit query',
            }
          ),
          enabled: (item) => {
            return !isLoading;
          },
          onClick: (item) => {
            onEditClick?.(item);
          },
          icon: 'pencil',
          type: 'icon',
        },
        {
          name: i18n.translate('xpack.streams.significantEventsTable.removeQueryActionTitle', {
            defaultMessage: 'Remove',
          }),
          description: i18n.translate(
            'xpack.streams.significantEventsTable.removeQueryActionDescription',
            {
              defaultMessage: 'Remove query from stream',
            }
          ),
          enabled: (item) => {
            return !isLoading;
          },
          onClick: (item) => {
            onDeleteClick?.(item);
          },
          icon: 'trash',
          type: 'icon',
        },
      ],
    },
  ];

  return (
    <EuiBasicTable
      tableCaption={i18n.translate('xpack.streams.significantEventsTable.tableCaption', {
        defaultMessage: 'Significant events',
      })}
      items={items}
      rowHeader="title"
      columns={columns}
      loading={response.loading}
      tableLayout="auto"
    />
  );
}
