/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBasicTable, EuiBasicTableColumn, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import type { SanitizedDashboardAsset } from '@kbn/streams-plugin/server/routes/dashboards/route';

export function ConfigurationTable({
  stream,
  compact = false,
  loading,
  dataTestSubj,
}: {
  stream: string;
  loading: boolean;
  compact?: boolean;
  dataTestSubj?: string;
}) {
  const columns = useMemo((): Array<EuiBasicTableColumn<SanitizedDashboardAsset>> => {
    return [
      {
        field: 'label',
        name: i18n.translate('xpack.streams.contentTable.nameColumnTitle', {
          defaultMessage: 'Name',
        }),
        render: (_, { title, id }) => <></>,
      },
    ];
  }, [compact]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false} />
      <EuiBasicTable
        data-test-subj={dataTestSubj}
        columns={columns}
        itemId="id"
        items={[]}
        loading={loading}
      />
    </EuiFlexGroup>
  );
}
