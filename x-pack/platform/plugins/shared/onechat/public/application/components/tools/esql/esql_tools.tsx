/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTableColumn,
  EuiButton,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiInMemoryTable,
  EuiText,
  EuiTitle,
  Search,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ToolDescriptor } from '@kbn/onechat-common';
import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useOnechatEsqlTools } from '../../../hooks/use_tools';
import { truncateAtNewline } from '../../../utils/truncate_at_newline';
import { OnechatToolTags } from '../tags/tool_tags';
import { OnechatCreateEsqlToolFlyout } from './create_esql_tool_flyout';

const columns: Array<EuiBasicTableColumn<ToolDescriptor>> = [
  {
    field: 'id',
    name: i18n.translate('xpack.onechat.tools.toolIdLabel', { defaultMessage: 'Tool' }),
    valign: 'top',
    sortable: true,
    render: (id: string) => (
      <EuiText size="s">
        <strong>{id}</strong>
      </EuiText>
    ),
  },
  {
    field: 'description',
    name: i18n.translate('xpack.onechat.tools.toolDescriptionLabel', {
      defaultMessage: 'Description',
    }),
    width: '60%',
    valign: 'top',
    render: (description: string) => {
      return <EuiText size="s">{truncateAtNewline(description)}</EuiText>;
    },
  },
  {
    field: 'meta.tags',
    name: i18n.translate('xpack.onechat.tools.tagsLabel', {
      defaultMessage: 'Tags',
    }),
    width: '15%',
    valign: 'top',
    render: (tags: string[]) => <OnechatToolTags tags={tags} />,
  },
];

export const OnechatEsqlTools: React.FC = () => {
  const { tools, isLoading, error } = useOnechatEsqlTools();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const { search: urlSearch, pathname } = useLocation();
  const history = useHistory();

  useEffect(() => {
    const params = new URLSearchParams(urlSearch);
    if (params.get('new_tool') === 'true') {
      setIsFlyoutOpen(true);
    }
  }, [urlSearch]);

  const handleCloseFlyout = () => {
    setIsFlyoutOpen(false);
    const params = new URLSearchParams(urlSearch);
    if (params.has('new_tool')) {
      params.delete('new_tool');
      history.push({ pathname, search: params.toString() });
    }
  };

  const errorMessage = error
    ? i18n.translate('xpack.onechat.tools.listToolsErrorMessage', {
        defaultMessage: 'Failed to fetch tools',
      })
    : undefined;

  const search: Search = {
    box: {
      incremental: true,
      placeholder: i18n.translate('xpack.onechat.tools.searchToolsPlaceholder', {
        defaultMessage: 'Search tools...',
      }),
      fullWidth: false,
    },
  };

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.onechat.tools.esqlToolsTitle', {
                defaultMessage: 'ES|QL Tools',
              })}
            </h2>
          </EuiTitle>
          <EuiButton
            key="new-esql-tool-button"
            fill
            iconType="plusInCircleFilled"
            onClick={() => setIsFlyoutOpen(true)}
          >
            {i18n.translate('xpack.onechat.tools.newToolButton', {
              defaultMessage: 'New ES|QL tool',
            })}
          </EuiButton>
        </EuiFlexGroup>
        <EuiText component="p" size="s">
          {i18n.translate('xpack.onechat.tools.esqlToolsDescription', {
            defaultMessage: 'Define your own custom tools using ES|QL queries.',
          })}
        </EuiText>
        <EuiHorizontalRule margin="xs" />
        <EuiInMemoryTable
          loading={isLoading}
          columns={columns}
          items={tools}
          itemId="id"
          error={errorMessage}
          search={search}
          pagination={{
            pageIndex: 0,
            pageSize: 10,
            showPerPageOptions: false,
          }}
          sorting={{
            sort: {
              field: 'id',
              direction: 'asc',
            },
          }}
          noItemsMessage={
            <EuiText component="p" size="s" textAlign="center" color="subdued">
              {i18n.translate('xpack.onechat.tools.noEsqlToolsMessage', {
                defaultMessage: "It looks like you don't have any ES|QL tools defined yet.",
              })}
            </EuiText>
          }
        />
      </EuiFlexGroup>
      <OnechatCreateEsqlToolFlyout
        isOpen={isFlyoutOpen}
        onClose={handleCloseFlyout}
        onSave={(data) => {
          // TODO: implement save
        }}
      />
    </>
  );
};
