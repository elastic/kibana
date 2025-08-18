/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiIcon,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiPanel,
} from '@elastic/eui';
import type { UserProfile } from '@kbn/core-user-profile-common';
import type { DataStreamApis } from '../use_data_stream_apis';
import { COPY_URL } from '../use_conversation/translations';
import { UserProfilesList } from './user_profiles_list';
import { useConversation } from '../use_conversation';
import * as i18n from './translations';
import type { Conversation } from '../../..';
import { useAssistantContext } from '../../..';
import { UserProfilesSearch } from './user_profiles_search';

interface Props {
  isSharedGlobal: boolean;
  selectedConversation: Conversation | undefined;
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  refetchCurrentUserConversations: DataStreamApis['refetchCurrentUserConversations'];
  refetchCurrentConversation: ({ isStreamRefetch }: { isStreamRefetch?: boolean }) => void;
}
const shareOptions = [
  {
    value: 'global',
    inputDisplay: i18n.WITH_EVERYONE,
    'data-test-subj': 'everyone',
  },
  {
    value: 'selected',
    inputDisplay: i18n.WITH_SELECTED,
    'data-test-subj': 'selected',
  },
];
const ShareModalComponent: React.FC<Props> = ({
  isSharedGlobal,
  isModalOpen,
  refetchCurrentConversation,
  refetchCurrentUserConversations,
  setIsModalOpen,
  selectedConversation,
}) => {
  const { copyConversationUrl, updateConversationUsers } = useConversation();
  const [sharingOption, setSharingOption] = useState<'global' | 'selected'>(
    isSharedGlobal ? 'global' : 'selected'
  );
  const { currentUser } = useAssistantContext();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [nextSelectedUsers, setNextSelectedUsers] = useState<UserProfile[]>([]);
  const [nextUsers, setNextUsers] = useState<UserProfile[]>([]);
  useEffect(() => {
    const conversationUsers =
      selectedConversation?.users
        // do not show current user in UI
        .filter((user) => user.id !== currentUser?.id && user.name !== currentUser?.name)
        .map(({ name, id }) => ({
          // id or name will be defined, empty string is fallback for TS
          uid: id ?? name ?? '',
          enabled: true,
          user: { username: name ?? id ?? '' },
          data: {},
        })) || [];
    setSelectedUsers(conversationUsers.map(({ uid }) => uid));
    setNextSelectedUsers(conversationUsers);
  }, [currentUser?.id, currentUser?.name, selectedConversation?.users]);
  const handleCopyUrl = useCallback(
    () => copyConversationUrl(selectedConversation),
    [copyConversationUrl, selectedConversation]
  );
  const accessText = useMemo(
    () => (sharingOption === 'global' ? i18n.EVERYONE : i18n.ONLY_SELECTED),
    [sharingOption]
  );

  const onNextUsersSelect = useCallback((updatedUsers: UserProfile[]) => {
    setNextUsers(updatedUsers);
  }, []);

  const onNextSelectedUsersSelect = useCallback((updatedUsers: UserProfile[]) => {
    setNextSelectedUsers(updatedUsers);
  }, []);

  const onCancelShare = useCallback(() => {
    setIsModalOpen(false);
  }, [setIsModalOpen]);

  const onSaveShare = useCallback(async () => {
    setIsModalOpen(false);
    if (selectedConversation && selectedConversation?.id !== '') {
      await updateConversationUsers({
        conversationId: selectedConversation.id,
        updatedUsers:
          sharingOption === 'global'
            ? []
            : [
                ...nextUsers.map((user) => ({
                  id: user?.uid ?? '',
                  name: user?.user?.username ?? '',
                })),
                ...nextSelectedUsers.map((user) => ({
                  id: user?.uid ?? '',
                  name: user?.user?.username ?? '',
                })),
                // readd current user
                ...(currentUser ? [{ id: currentUser.id, name: currentUser.name }] : []),
              ],
      });
      await refetchCurrentUserConversations();
      refetchCurrentConversation({});
    }
  }, [
    currentUser,
    nextSelectedUsers,
    nextUsers,
    refetchCurrentConversation,
    refetchCurrentUserConversations,
    selectedConversation,
    setIsModalOpen,
    sharingOption,
    updateConversationUsers,
  ]);
  const selectIcon = useMemo(
    () => (sharingOption === 'global' ? 'globe' : 'users'),
    [sharingOption]
  );

  return isModalOpen ? (
    <EuiModal onClose={onCancelShare} maxWidth={600} data-test-subj="shareConversationModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle className="eui-textTruncate">
          {`${i18n.SHARE} `} <strong>{selectedConversation?.title}</strong>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiPanel hasShadow={false} hasBorder={true}>
          <EuiText size="s">
            <strong>{i18n.WHO_HAS_ACCESS}</strong>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiSuperSelect
            hasDividers
            fullWidth
            prepend={<EuiIcon type={selectIcon} />}
            options={shareOptions}
            valueOfSelected={sharingOption}
            onChange={(id) => setSharingOption(id as 'global' | 'selected')}
          />
        </EuiPanel>
        <EuiSpacer />

        {sharingOption === 'selected' && (
          <>
            <UserProfilesSearch
              onUsersSelect={onNextUsersSelect}
              selectedUsers={nextUsers}
              forbiddenUsers={[...selectedUsers, ...(currentUser?.id ? [currentUser?.id] : [])]}
            />
            <EuiSpacer size="m" />
          </>
        )}

        <EuiText size="s">
          <strong>{i18n.WHO_HAS_ACCESS}</strong>
          <p>{accessText}</p>
        </EuiText>
        {sharingOption === 'selected' && (
          <UserProfilesList
            onUsersSelect={onNextSelectedUsersSelect}
            allUsers={selectedUsers}
            selectedUsers={nextSelectedUsers}
          />
        )}

        <EuiSpacer size="m" />

        <EuiButton
          data-test-subj="copyConversationUrl"
          iconType="copyClipboard"
          onClick={handleCopyUrl}
        >
          {COPY_URL}
        </EuiButton>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton data-test-subj="shareConversation" onClick={onSaveShare} fill>
          {i18n.DONE}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  ) : null;
};

export const ShareModal = React.memo(ShareModalComponent);
