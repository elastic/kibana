/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiMarkdownFormat,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ToolDescriptor } from '@kbn/onechat-common';
import React from 'react';
import { useOnechatBaseTools } from '../../hooks/use_tools';

const columns: Array<EuiBasicTableColumn<ToolDescriptor>> = [
  {
    name: i18n.translate('xpack.onechat.tools.base.toolIdLabel', { defaultMessage: 'Tool' }),
    valign: 'top',
    render: ({ id, meta }: ToolDescriptor) => (
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
        <EuiText size="s">
          <strong>{id}</strong>
        </EuiText>
        <EuiFlexGroup>
          {meta.tags.map((tag) => (
            <EuiBadge key={tag} color="primary">
              {tag}
            </EuiBadge>
          ))}
        </EuiFlexGroup>
      </EuiFlexGroup>
    ),
  },
  {
    field: 'description',
    name: i18n.translate('xpack.onechat.tools.base.toolDescriptionLabel', {
      defaultMessage: 'Description',
    }),
    width: '80%',
    valign: 'top',
    render: (description: string) => {
      // Remove spaces after newlines, prevents from unintentionally rendering as code blocks
      return (
        <EuiMarkdownFormat textSize="s">
          {description.replaceAll(/(?<=\n)\s+/g, '')}
        </EuiMarkdownFormat>
      );
    },
  },
];

export const OnechatBaseTools: React.FC = () => {
  const { tools, isLoading, error } = useOnechatBaseTools();
  const errorMessage = error
    ? i18n.translate('xpack.onechat.tools.base.listToolsErrorMessage', {
        defaultMessage: 'Failed to fetch base tools',
      })
    : undefined;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.onechat.tools.base.toolsTitle', {
            defaultMessage: 'Base Tools',
          })}
        </h2>
      </EuiTitle>
      <EuiText component="p" size="s">
        {i18n.translate('xpack.onechat.tools.base.toolsDescription', {
          defaultMessage: 'Out-of-the-box tools ready for use in your chat experience.',
        })}
      </EuiText>
      <EuiHorizontalRule margin="xs" />
      <EuiBasicTable
        loading={isLoading}
        columns={columns}
        items={tools}
        itemId="id"
        noItemsMessage={i18n.translate('xpack.onechat.tools.base.noToolsMessage', {
          defaultMessage: 'No base tools found',
        })}
        error={errorMessage}
      />
    </EuiFlexGroup>
  );
};
