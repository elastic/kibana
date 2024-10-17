/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAvatar, EuiBadge, EuiBasicTableColumn, EuiIcon, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo } from 'react';
import { FormattedDate } from '@kbn/i18n-react';
import {
  DocumentEntryType,
  IndexEntryType,
  KnowledgeBaseEntryResponse,
} from '@kbn/elastic-assistant-common';

import useAsync from 'react-use/lib/useAsync';
import { useAssistantContext } from '../../..';
import * as i18n from './translations';
import { BadgesColumn } from '../../assistant/common/components/assistant_settings_management/badges';
import { useInlineActions } from '../../assistant/common/components/assistant_settings_management/inline_actions';
import { isSystemEntry } from './helpers';

const AuthorColumn = ({ entry }: { entry: KnowledgeBaseEntryResponse }) => {
  const { currentUserAvatar, userProfileService } = useAssistantContext();

  const userProfile = useAsync(async () => {
    const profile = await userProfileService?.bulkGet({ uids: new Set([entry.createdBy]) });
    return profile?.[0].user.username;
  }, []);

  const userName = useMemo(() => userProfile?.value ?? 'Unknown', [userProfile?.value]);
  const badgeItem = isSystemEntry(entry) ? 'Elastic' : userName;
  const userImage = isSystemEntry(entry) ? (
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
};

export const useKnowledgeBaseTable = () => {
  const getActions = useInlineActions<KnowledgeBaseEntryResponse & { isDefault?: undefined }>();

  const getIconForEntry = (entry: KnowledgeBaseEntryResponse): string => {
    if (entry.type === DocumentEntryType.value) {
      if (entry.kbResource === 'user') {
        return 'userAvatar';
      }
      if (['esql', 'security_labs'].includes(entry.kbResource)) {
        return 'logoElastic';
      }
      return 'document';
    } else if (entry.type === IndexEntryType.value) {
      return 'index';
    }
    return 'questionInCircle';
  };

  const getColumns = useCallback(
    ({
      isDeleteEnabled,
      isEditEnabled,
      onDeleteActionClicked,
      onEditActionClicked,
    }: {
      isDeleteEnabled: (entry: KnowledgeBaseEntryResponse) => boolean;
      isEditEnabled: (entry: KnowledgeBaseEntryResponse) => boolean;
      onDeleteActionClicked: (entry: KnowledgeBaseEntryResponse) => void;
      onEditActionClicked: (entry: KnowledgeBaseEntryResponse) => void;
    }): Array<EuiBasicTableColumn<KnowledgeBaseEntryResponse>> => {
      return [
        {
          name: '',
          render: (entry: KnowledgeBaseEntryResponse) => <EuiIcon type={getIconForEntry(entry)} />,
          width: '24px',
        },
        {
          name: i18n.COLUMN_NAME,
          render: ({ name }: KnowledgeBaseEntryResponse) => name,
          sortable: ({ name }: KnowledgeBaseEntryResponse) => name,
          width: '30%',
        },
        {
          name: i18n.COLUMN_SHARING,
          sortable: ({ users }: KnowledgeBaseEntryResponse) => users.length,
          render: ({ id, users }: KnowledgeBaseEntryResponse) => {
            const sharingItem = users.length > 0 ? i18n.PRIVATE : i18n.GLOBAL;
            const color = users.length > 0 ? 'hollow' : 'primary';
            return <BadgesColumn items={[sharingItem]} prefix={id} color={color} />;
          },
          width: '100px',
        },
        {
          name: i18n.COLUMN_AUTHOR,
          sortable: ({ users }: KnowledgeBaseEntryResponse) => users[0]?.name,
          render: (entry: KnowledgeBaseEntryResponse) => <AuthorColumn entry={entry} />,
        },
        {
          name: i18n.COLUMN_ENTRIES,
          render: (entry: KnowledgeBaseEntryResponse) => {
            return isSystemEntry(entry)
              ? entry.text
              : entry.type === DocumentEntryType.value
              ? '1'
              : '-';
          },
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
            isDeleteEnabled,
            isEditEnabled,
            onDelete: onDeleteActionClicked,
            onEdit: onEditActionClicked,
          }),
        },
      ];
    },
    [getActions]
  );
  return { getColumns };
};
