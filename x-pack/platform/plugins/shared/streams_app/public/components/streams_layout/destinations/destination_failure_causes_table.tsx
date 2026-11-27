/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, type EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  formatEventsRate,
  formatPercentage,
  STATS_NO_VALUE_LABEL,
} from '../../../services/unit_stats_client/format_stats';
import type { FailureCauseView } from '../../../services/unit_stats_client/types';
import { REMOTE_ELASTICSEARCH_TYPE } from './types';

/**
 * The causes of one failure class as a table, set up as the indices table of the flyout is:
 * compressed, with a fixed layout. It has the collection and the error type, when some cause has
 * them, then the percentage and the rate of each. S3 has no collection, so it has no such column.
 * A name that wraps makes its row taller, and the rest of the row stays in line, because the table
 * owns the rows.
 */
export function DestinationFailureCausesTable({
  causes,
  caption,
  destinationType,
  dataTestSubj,
}: {
  causes: FailureCauseView[];
  caption: string;
  destinationType: string;
  dataTestSubj: string;
}) {
  // What an Elasticsearch destination reports as the collection is the name of an index.
  const isElasticsearch =
    destinationType === 'elasticsearch' || destinationType === REMOTE_ELASTICSEARCH_TYPE;
  const hasCollection = causes.some(({ collection }) => collection !== null);
  const hasReason = causes.some(({ reason }) => reason !== null);

  const columns: Array<EuiBasicTableColumn<FailureCauseView>> = [];
  if (hasCollection) {
    columns.push({
      field: 'collection',
      name: isElasticsearch
        ? i18n.translate('xpack.streams.destinations.failures.columnIndexName', {
            defaultMessage: 'Index name',
          })
        : i18n.translate('xpack.streams.destinations.failures.columnCollection', {
            defaultMessage: 'Collection',
          }),
      'data-test-subj': `${dataTestSubj}Collection`,
      render: (_value: unknown, { collection }: FailureCauseView) =>
        collection ?? STATS_NO_VALUE_LABEL,
    });
  }
  if (hasReason) {
    columns.push({
      field: 'reason',
      name: i18n.translate('xpack.streams.destinations.failures.columnErrorType', {
        defaultMessage: 'Error type',
      }),
      'data-test-subj': `${dataTestSubj}ErrorType`,
      render: (_value: unknown, { reason }: FailureCauseView) => reason ?? STATS_NO_VALUE_LABEL,
    });
  }
  columns.push(
    {
      field: 'percentage',
      name: i18n.translate('xpack.streams.destinations.failures.columnPercentage', {
        defaultMessage: 'Percentage',
      }),
      align: 'right',
      width: '96px',
      'data-test-subj': `${dataTestSubj}Percentage`,
      render: (_value: unknown, { percentage }: FailureCauseView) => formatPercentage(percentage),
    },
    {
      field: 'rate',
      name: i18n.translate('xpack.streams.destinations.failures.columnRate', {
        defaultMessage: 'Rate',
      }),
      align: 'right',
      width: '80px',
      'data-test-subj': `${dataTestSubj}Rate`,
      render: (_value: unknown, { rate }: FailureCauseView) => formatEventsRate(rate),
    }
  );

  return (
    <EuiBasicTable
      compressed
      tableLayout="fixed"
      tableCaption={caption}
      items={causes}
      columns={columns}
      rowHeader={hasCollection ? 'collection' : 'reason'}
      data-test-subj={dataTestSubj}
    />
  );
}
