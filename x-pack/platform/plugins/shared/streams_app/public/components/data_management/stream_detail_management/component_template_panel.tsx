/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiPanel,
  EuiIcon,
  EuiLink,
  EuiBasicTableColumn,
  EuiText,
  EuiInMemoryTable,
  useEuiTheme,
  EuiFlexGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  UnmanagedComponentTemplateDetails,
  UnmanagedElasticsearchAssetDetails,
} from '@kbn/streams-plugin/server/lib/streams/stream_crud';
import { css } from '@emotion/css';
import { ManagedBadge } from './managed_badge';

export function ComponentTemplatePanel({
  componentTemplates,
  onFlyoutOpen,
}: {
  componentTemplates: UnmanagedElasticsearchAssetDetails['componentTemplates'] | undefined;
  onFlyoutOpen: (name: string) => void;
}) {
  const theme = useEuiTheme();

  const columns: Array<EuiBasicTableColumn<UnmanagedComponentTemplateDetails>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.streams.componentTemplatePanel.nameColumn', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        truncateText: true,
        render: (name: string, record) => (
          <span>
            <EuiLink
              onClick={() => {
                onFlyoutOpen(name);
              }}
            >
              {name}
            </EuiLink>
            <ManagedBadge meta={record.component_template?._meta} />
          </span>
        ),
      },
      {
        field: 'used_by',
        name: i18n.translate('xpack.streams.componentTemplatePanel.usageCountColumn', {
          defaultMessage: 'Usage count',
        }),
        truncateText: true,
        render: (_, record) => (record.used_by ? record.used_by.length : 0),
        sortable: ({ used_by: usedBy }) => usedBy.length,
      },
      {
        field: 'mappings',
        name: i18n.translate('xpack.streams.componentTemplatePanel.mappingsColumn', {
          defaultMessage: 'Mappings',
        }),
        render: (_, record) =>
          record.component_template?.template.mappings ? <EuiIcon type="check" /> : '-',
      },
      {
        field: 'settings',
        name: i18n.translate('xpack.streams.componentTemplatePanel.settingsColumn', {
          defaultMessage: 'Settings',
        }),
        render: (_, record) =>
          record.component_template?.template.settings ? <EuiIcon type="check" /> : '-',
      },
      {
        field: 'aliases',
        name: i18n.translate('xpack.streams.componentTemplatePanel.aliasesColumn', {
          defaultMessage: 'Aliases',
        }),
        render: (_, record) => (
          <span>
            {record.component_template?.template.aliases ? <EuiIcon type="check" /> : '-'}
          </span>
        ),
      },
    ],
    [onFlyoutOpen]
  );

  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiText>
          {i18n.translate('xpack.streams.componentTemplatePanel.title', {
            defaultMessage: 'Component templates',
          })}
        </EuiText>
        {componentTemplates && (
          <EuiInMemoryTable
            items={componentTemplates}
            columns={columns}
            tableLayout={'auto'}
            // align text with heading
            className={css`
              margin: 0 -${theme.euiTheme.size.s};
            `}
          />
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
