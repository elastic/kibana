/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAvatar,
  EuiBadge,
  EuiBasicTableColumn,
  EuiIcon,
  EuiText,
  EuiLoadingSpinner,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo } from 'react';
import { FormattedDate } from '@kbn/i18n-react';
import {
  DocumentEntryType,
  IndexEntryType,
  KnowledgeBaseEntryResponse,
} from '@kbn/elastic-assistant-common';

import useAsync from 'react-use/lib/useAsync';
import { UserProfileAvatarData } from '@kbn/user-profile-components';
import { useAssistantContext } from '../../..';
import * as i18n from './translations';
import { BadgesColumn } from '../../assistant/common/components/assistant_settings_management/badges';
import { useInlineActions } from '../../assistant/common/components/assistant_settings_management/inline_actions';
import { isSystemEntry } from './helpers';
import { SetupKnowledgeBaseButton } from '../setup_knowledge_base_button';

const AuthorColumn = ({ entry }: { entry: KnowledgeBaseEntryResponse }) => {
  const { userProfileService } = useAssistantContext();

  const userProfile = useAsync(async () => {
    if (isSystemEntry(entry) || entry.createdBy === 'unknown') {
      return;
    }

    const profile = await userProfileService?.bulkGet<{ avatar: UserProfileAvatarData }>({
      uids: new Set([entry.createdBy]),
      dataPath: 'avatar',
    });
    return { username: profile?.[0].user.username, avatar: profile?.[0].data.avatar };
  }, [entry.createdBy]);

  const userName = useMemo(
    () => userProfile?.value?.username ?? 'Unknown',
    [userProfile?.value?.username]
  );
  const userAvatar = userProfile?.value?.avatar;
  const badgeItem = isSystemEntry(entry) ? 'Elastic' : userName;
  const userImage = isSystemEntry(entry) ? (
    <EuiIcon
      type={'logoElastic'}
      css={css`
        margin-left: 4px;
        margin-right: 14px;
      `}
    />
  ) : userAvatar?.imageUrl != null ? (
    <EuiAvatar
      name={userName}
      imageUrl={userAvatar.imageUrl}
      size={'s'}
      color={userAvatar.color ?? 'subdued'}
      css={css`
        margin-right: 10px;
      `}
    />
  ) : (
    <EuiAvatar
      name={userName}
      initials={userAvatar?.initials}
      size={'s'}
      color={userAvatar?.color ?? 'subdued'}
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

const NameColumn = ({
  entry,
  existingIndices,
}: {
  entry: KnowledgeBaseEntryResponse;
  existingIndices?: string[];
}) => {
  let showMissingIndexWarning = false;
  if (existingIndices && entry.type === 'index') {
    showMissingIndexWarning = !existingIndices.includes(entry.index);
  }
  return (
    <>
      <EuiText size={'s'}>{entry.name}</EuiText>
      {showMissingIndexWarning && (
        <EuiToolTip
          data-test-subj="missing-index-tooltip"
          content={i18n.MISSING_INDEX_TOOLTIP_CONTENT}
        >
          <EuiIcon
            data-test-subj="missing-index-icon"
            type="warning"
            color="danger"
            css={css`
              margin-left: 10px;
            `}
          />
        </EuiToolTip>
      )}
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
      existingIndices,
      isDeleteEnabled,
      isEditEnabled,
      onDeleteActionClicked,
      onEditActionClicked,
      isKbSetupInProgress,
    }: {
      existingIndices?: string[];
      isDeleteEnabled: (entry: KnowledgeBaseEntryResponse) => boolean;
      isEditEnabled: (entry: KnowledgeBaseEntryResponse) => boolean;
      onDeleteActionClicked: (entry: KnowledgeBaseEntryResponse) => void;
      onEditActionClicked: (entry: KnowledgeBaseEntryResponse) => void;
      isKbSetupInProgress: boolean;
    }): Array<EuiBasicTableColumn<KnowledgeBaseEntryResponse>> => {
      return [
        {
          name: '',
          render: (entry: KnowledgeBaseEntryResponse) => <EuiIcon type={getIconForEntry(entry)} />,
          width: '24px',
        },
        {
          name: i18n.COLUMN_NAME,
          render: (entry: KnowledgeBaseEntryResponse) => (
            <NameColumn entry={entry} existingIndices={existingIndices} />
          ),
          sortable: ({ name }: KnowledgeBaseEntryResponse) => name.toLocaleLowerCase() + name, // Ensures that the sorting is case-insensitive and that the sorting is stable
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
          render: (entry: KnowledgeBaseEntryResponse) => <AuthorColumn entry={entry} />,
        },
        {
          name: i18n.COLUMN_ENTRIES,
          render: (entry: KnowledgeBaseEntryResponse) => {
            return isSystemEntry(entry) ? (
              <>
                {`${entry.text}`}
                {isKbSetupInProgress ? (
                  <EuiLoadingSpinner
                    size="m"
                    css={css`
                      margin-left: 8px;
                    `}
                  />
                ) : (
                  <EuiToolTip content={i18n.SECURITY_LABS_NOT_FULLY_LOADED}>
                    <SetupKnowledgeBaseButton display="refresh" />
                  </EuiToolTip>
                )}
              </>
            ) : entry.type === DocumentEntryType.value ? (
              '1'
            ) : (
              '-'
            );
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
