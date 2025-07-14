/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBadgeGroup,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ToolDefinition } from '@kbn/onechat-common';
import React from 'react';
import { useOnechatBaseTools } from '../../hooks/use_tools';
import { truncateAtNewline } from '../../utils/truncate_at_newline';

const columns: Array<EuiBasicTableColumn<ToolDefinition>> = [
  {
    field: 'id',
    name: i18n.translate('xpack.onechat.tools.toolIdLabel', { defaultMessage: 'Tool' }),
    valign: 'top',
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
    field: 'tags',
    name: i18n.translate('xpack.onechat.tools.tagsLabel', {
      defaultMessage: 'Tags',
    }),
    width: '15%',
    valign: 'top',
    render: (tags: string[]) => {
      return (
        <EuiBadgeGroup>
          {tags.map((tag) => (
            <EuiBadge key={tag} color="primary">
              {tag}
            </EuiBadge>
          ))}
        </EuiBadgeGroup>
      );
    },
  },
];

export const OnechatBaseTools: React.FC = () => {
  const { tools, isLoading, error } = useOnechatBaseTools();
  const errorMessage = error
    ? i18n.translate('xpack.onechat.tools.listToolsErrorMessage', {
        defaultMessage: 'Failed to fetch tools',
      })
    : undefined;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.onechat.tools.baseToolsTitle', { defaultMessage: 'Base Tools' })}
        </h2>
      </EuiTitle>
      <EuiText component="p" size="s">
        {i18n.translate('xpack.onechat.tools.baseToolsDescription', {
          defaultMessage: 'Out-of-the-box tools ready for use in your chat experience.',
        })}
      </EuiText>
      <EuiHorizontalRule margin="xs" />
      <EuiBasicTable
        loading={isLoading}
        columns={columns}
        items={tools}
        itemId="id"
        error={errorMessage}
      />
    </EuiFlexGroup>
  );
};
