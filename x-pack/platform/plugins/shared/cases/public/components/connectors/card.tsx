/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash/fp';
import React, { memo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSkeletonText,
  EuiText,
  type EuiBasicTableColumn,
  EuiBasicTable,
  type EuiBasicTableProps,
} from '@elastic/eui';

import type { ConnectorTypes } from '../../../common/types/domain';
import { useKibana } from '../../common/lib/kibana';
import { getConnectorIcon } from '../utils';
import {
  CARD_TABLE_CAPTION,
  CARD_TABLE_FIELD_COLUMN_NAME,
  CARD_TABLE_VALUE_COLUMN_NAME,
} from './translations';

interface Item {
  title: string;
  description: React.ReactNode;
}

interface ConnectorCardProps {
  connectorType: ConnectorTypes;
  title: string;
  listItems: Array<Item>;
  isLoading: boolean;
}

const columns: Array<EuiBasicTableColumn<Item>> = [
  {
    field: 'title',
    name: CARD_TABLE_FIELD_COLUMN_NAME,
    truncateText: true,
    textOnly: true,

    render: (title: Item['title']) => {
      return (
        <EuiText size="xs" data-test-subj="card-list-item">
          {title}
        </EuiText>
      );
    },
  },
  {
    name: CARD_TABLE_VALUE_COLUMN_NAME,
    render: ({ description, title }: Item) => (
      <EuiText size="xs" data-test-subj="card-list-item" key={title}>
        {Array.isArray(description) || isString(description) || React.isValidElement(description)
          ? description
          : JSON.stringify(description)}
      </EuiText>
    ),
  },
];

const rowProps: EuiBasicTableProps<Item>['rowProps'] = {
  'data-test-subj': 'card-list-item-row',
};

const ConnectorCardDisplay: React.FC<ConnectorCardProps> = ({
  connectorType,
  title,
  listItems,
  isLoading,
}) => {
  const { triggersActionsUi } = useKibana().services;

  return (
    <EuiSkeletonText
      lines={3}
      size="m"
      isLoading={isLoading}
      data-test-subj="connector-card-loading"
    >
      <EuiFlexGroup direction="column" data-test-subj="connector-card" gutterSize="s">
        <EuiFlexGroup direction="row" justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiText size="s" data-test-subj="connector-card-title">
              <strong>{title}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon size="xl" type={getConnectorIcon(triggersActionsUi, connectorType)} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexItem data-test-subj="connector-card-details">
          {listItems.length > 0 && (
            <EuiBasicTable
              rowProps={rowProps}
              tableCaption={CARD_TABLE_CAPTION}
              responsiveBreakpoint={false}
              items={listItems}
              columns={columns}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiSkeletonText>
  );
};
ConnectorCardDisplay.displayName = 'ConnectorCardDisplay';

export const ConnectorCard = memo(ConnectorCardDisplay);
