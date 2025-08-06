/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButtonGroup,
  EuiSpacer,
  EuiText,
  EuiCopy,
} from '@elastic/eui';
import { UserProfile } from '@kbn/core-user-profile-common';
import { useConversation } from '../use_conversation';
import { COPY_URL } from '../settings/settings_context_menu/translations';
import * as i18n from './translations';
import { Conversation, useAssistantContext } from '../../..';
import { UserProfilesSearch } from './user_profiles_search';

interface Props {
  selectedConversation: Conversation | undefined;
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  refetchCurrentConversation: ({ isStreamRefetch }: { isStreamRefetch?: boolean }) => void;
}
const shareOptions = [
  {
    id: 'everyone',
    label: i18n.WITH_EVERYONE,
    iconType: 'globe',
  },
  {
    id: 'selected',
    label: i18n.WITH_SELECTED,
    iconType: 'user',
  },
];
const ShareModalComponent: React.FC<Props> = ({
  isModalOpen,
  refetchCurrentConversation,
  setIsModalOpen,
  selectedConversation,
}) => {
  const { updateConversationUsers } = useConversation();
  const [sharingOption, setSharingOption] = useState<'everyone' | 'selected'>('everyone');
  const { currentUser } = useAssistantContext();
  const [nextUsers, setNextUsers] = useState<UserProfile[]>([]);
  useEffect(() => {
    setNextUsers(
      selectedConversation?.users
        // do not show current user in UI
        .filter((user) => user.id !== currentUser?.id && user.name !== currentUser?.name)
        .map(({ name, id }) => ({
          // id or name will be defined, empty string is fallback for TS
          uid: id ?? name ?? '',
          enabled: true,
          user: { username: name ?? id ?? '' },
          data: {},
        })) || []
    );
  }, [currentUser?.id, currentUser?.name, selectedConversation?.users]);

  const accessText = useMemo(
    () => (sharingOption === 'everyone' ? i18n.EVERYONE : i18n.ONLY_SELECTED),
    [sharingOption]
  );

  const onUsersSelect = useCallback((updatedUsers: UserProfile[]) => {
    setNextUsers(updatedUsers);
  }, []);

  const onCancelShare = useCallback(() => {
    setIsModalOpen(false);
  }, [setIsModalOpen]);

  const onSaveShare = useCallback(async () => {
    setIsModalOpen(false);
    if (selectedConversation && selectedConversation?.id !== '') {
      await updateConversationUsers({
        conversationId: selectedConversation.id,
        updatedUsers: [
          ...nextUsers.map((user) => ({
            id: user?.uid ?? '',
            name: user?.user?.username ?? '',
          })),
          // readd current user
          ...(currentUser ? [{ id: currentUser.id, name: currentUser.name }] : []),
        ],
      });
      refetchCurrentConversation({});
    }
  }, [
    currentUser,
    nextUsers,
    refetchCurrentConversation,
    selectedConversation,
    setIsModalOpen,
    updateConversationUsers,
  ]);

  return isModalOpen ? (
    <EuiModal onClose={onCancelShare} maxWidth={600}>
      <EuiModalHeader>
        <EuiModalHeaderTitle className="eui-textTruncate">
          {`${i18n.SHARE} `} <strong>{selectedConversation?.title}</strong>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiButtonGroup
          options={shareOptions}
          isFullWidth
          idSelected={sharingOption}
          onChange={(id) => setSharingOption(id as 'everyone' | 'selected')}
          legend="shareOptions"
          buttonSize="compressed"
        />

        <EuiSpacer />

        {sharingOption === 'selected' && (
          <>
            <UserProfilesSearch onUsersSelect={onUsersSelect} selectedUsers={nextUsers} />
            <EuiSpacer size="m" />
          </>
        )}

        <EuiText size="s">
          <strong>{i18n.WHO_HAS_ACCESS}</strong>
          <p>{accessText}</p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiCopy textToCopy="https://your.app/share-link">
          {(copy) => (
            <EuiButton iconType="copyClipboard" onClick={copy}>
              {COPY_URL}
            </EuiButton>
          )}
        </EuiCopy>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton onClick={onSaveShare} fill>
          {i18n.DONE}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  ) : null;
};

export const ShareModal = React.memo(ShareModalComponent);
