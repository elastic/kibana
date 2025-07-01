/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiBadgeGroup, EuiBasicTable, EuiBasicTableColumn, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ToolDescriptor } from '@kbn/onechat-common';
import React from 'react';
import { useOnechatTools } from '../../hooks/use_tools';

const parseToolDescription = (description: string): string => {
  // Truncate at newline
  const [truncatedDescription] = description.split('\n');
  return truncatedDescription;
};

const columns: Array<EuiBasicTableColumn<ToolDescriptor>> = [
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
      return <EuiText size="s">{parseToolDescription(description)}</EuiText>;
    },
  },
  {
    field: 'meta.tags',
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

export const OnechatToolsTable: React.FC = () => {
  const { tools, isLoading, error } = useOnechatTools();
  const errorMessage = error
    ? i18n.translate('xpack.onechat.tools.listToolsErrorMessage', {
        defaultMessage: 'Failed to fetch tools',
      })
    : undefined;

  return (
    <EuiBasicTable
      loading={isLoading}
      columns={columns}
      items={tools}
      itemId="id"
      noItemsMessage={i18n.translate('xpack.onechat.tools.noToolsMessage', {
        defaultMessage: 'No tools found',
      })}
      error={errorMessage}
    />
  );
};
