/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAvatar, EuiBadge, EuiBasicTableColumn, EuiIcon, EuiLink, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback } from 'react';
import { FormattedDate } from '@kbn/i18n-react';
import {
  DocumentEntryType,
  IndexEntryType,
  KnowledgeBaseEntryResponse,
} from '@kbn/elastic-assistant-common';
import { useAssistantContext } from '../../..';
import * as i18n from './translations';
import { BadgesColumn } from '../../assistant/common/components/assistant_settings_management/badges';
import { useInlineActions } from '../../assistant/common/components/assistant_settings_management/inline_actions';
import { isEsqlSystemEntry } from './helpers';

export const useKnowledgeBaseTable = () => {
  const { currentUserAvatar } = useAssistantContext();
  const getActions = useInlineActions<KnowledgeBaseEntryResponse & { isDefault?: undefined }>();

  const getIconForEntry = (entry: KnowledgeBaseEntryResponse): string => {
    if (entry.type === DocumentEntryType.value) {
      if (entry.kbResource === 'user') {
        return 'userAvatar';
      }
      if (entry.kbResource === 'esql') {
        return 'logoElastic';
      }
      return 'visText';
    } else if (entry.type === IndexEntryType.value) {
      return 'index';
    }
    return 'questionInCircle';
  };

  const getColumns = useCallback(
    ({
      onEntryNameClicked,
      onSpaceNameClicked,
      onDeleteActionClicked,
      onEditActionClicked,
    }): Array<EuiBasicTableColumn<KnowledgeBaseEntryResponse>> => {
      return [
        {
          name: '',
          render: (entry: KnowledgeBaseEntryResponse) => <EuiIcon type={getIconForEntry(entry)} />,
          width: '24px',
        },
        {
          name: i18n.COLUMN_NAME,
          render: ({ id, name }: KnowledgeBaseEntryResponse) => (
            <EuiLink onClick={() => onEntryNameClicked({ id })}>{name}</EuiLink>
          ),
          sortable: ({ name }: KnowledgeBaseEntryResponse) => name,
          width: '30%',
        },
        {
          name: i18n.COLUMN_SHARING,
          render: ({ id, users }: KnowledgeBaseEntryResponse) => {
            const sharingItem = users.length > 0 ? i18n.PRIVATE : i18n.GLOBAL;
            const color = users.length > 0 ? 'hollow' : 'primary';
            return <BadgesColumn items={[sharingItem]} prefix={id} color={color} />;
          },
          width: '75px',
        },
        {
          name: i18n.COLUMN_AUTHOR,
          render: (entry: KnowledgeBaseEntryResponse) => {
            const userName = entry.users?.[0]?.name ?? 'Unknown';
            const badgeItem = isEsqlSystemEntry(entry) ? 'Elastic' : userName;
            const userImage = isEsqlSystemEntry(entry) ? (
              <EuiIcon
                type={'logoElastic'}
                css={css`
                  margin-left: 4px;
                  margin-right: 14px;
                `}
              />
            ) : currentUserAvatar?.imageUrl != null ? (
              <EuiAvatar
                name={userName}
                imageUrl={currentUserAvatar.imageUrl}
                size={'s'}
                color={currentUserAvatar?.color ?? 'subdued'}
                css={css`
                  margin-right: 10px;
                `}
              />
            ) : (
              <EuiAvatar
                name={userName}
                initials={currentUserAvatar?.initials}
                size={'s'}
                color={currentUserAvatar?.color ?? 'subdued'}
                css={css`
                  margin-right: 10px;
                `}
              />
            );
            return (
              <>
                {userImage}
                <EuiText size={'s'}>{badgeItem}</EuiText>
              </>
            );
          },
        },
        {
          name: i18n.COLUMN_ENTRIES,
          render: (entry: KnowledgeBaseEntryResponse) => {
            return isEsqlSystemEntry(entry)
              ? entry.text
              : entry.type === DocumentEntryType.value
              ? '1'
              : '-';
          },
        },
        {
          name: i18n.COLUMN_SPACE,
          render: ({ namespace }: { namespace: string }) => (
            <EuiAvatar
              size="s"
              type="space"
              name={namespace}
              color={'#7DDED8'}
              casing={'capitalize'}
            />
          ),
          sortable: ({ namespace }: KnowledgeBaseEntryResponse) => namespace,
        },
        {
          name: i18n.COLUMN_CREATED,
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
          ...getActions({
            onDelete: onDeleteActionClicked,
            onEdit: onEditActionClicked,
            disabled: false,
          }),
        },
      ];
    },
    [currentUserAvatar, getActions]
  );
  return { getColumns };
};
