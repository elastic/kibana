/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiBasicTableColumn, EuiLink } from '@elastic/eui';
import React, { useCallback } from 'react';
import { FormattedDate } from '@kbn/i18n-react';
import { KnowledgeBaseEntryResponse } from '@kbn/elastic-assistant-common';
import * as i18n from './translations';
import { RowActions } from '../../assistant/common/components/assistant_settings_management/row_actions';
import { BadgesColumn } from '../../assistant/common/components/assistant_settings_management/badges';

export const useKnowledgeBaseTable = () => {
  const getColumns = useCallback(
    ({
      onEntryNameClicked,
      onSpaceNameClicked,
      onDeleteActionClicked,
      onEditActionClicked,
    }): Array<EuiBasicTableColumn<KnowledgeBaseEntryResponse>> => {
      return [
        {
          name: i18n.COLUMN_NAME,
          render: ({ id }: KnowledgeBaseEntryResponse) => (
            <EuiLink onClick={() => onEntryNameClicked(id)}>{id}</EuiLink>
          ),
          sortable: ({ id }: KnowledgeBaseEntryResponse) => id,
        },
        {
          name: i18n.COLUMN_USERS,
          render: ({ id, users }: KnowledgeBaseEntryResponse) => {
            const items = users?.reduce<string[]>((acc, user) => {
              if (user.name && user.name.length > 0) {
                acc.push(user.name);
              }
              return acc;
            }, []);
            return <BadgesColumn items={items} prefix={id} />;
          },
        },
        {
          name: i18n.COLUMN_SPACE,
          render: ({ namespace }: { namespace: string }) => (
            <EuiLink onClick={() => onSpaceNameClicked(namespace)}>{namespace}</EuiLink>
          ),
          sortable: ({ namespace }: KnowledgeBaseEntryResponse) => namespace,
        },
        {
          name: i18n.COLUMN_DATE_CREATED,
          render: ({ createdAt }: { createdAt: string }) => (
            <>
              {createdAt ? (
                <EuiBadge color="hollow">
                  <FormattedDate
                    value={new Date(createdAt)}
                    year="numeric"
                    month="2-digit"
                    day="numeric"
                  />
                </EuiBadge>
              ) : null}
            </>
          ),
          sortable: ({ createdAt }: KnowledgeBaseEntryResponse) => createdAt,
        },
        {
          name: i18n.COLUMN_ACTIONS,
          render: (knowledgeBase: KnowledgeBaseEntryResponse) => (
            <RowActions<KnowledgeBaseEntryResponse>
              rowItem={knowledgeBase}
              onDelete={onDeleteActionClicked}
              onEdit={onEditActionClicked}
              isDeletable
            />
          ),
        },
      ];
    },
    []
  );
  return { getColumns };
};
