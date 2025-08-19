/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import type { UserProfile } from '@kbn/core-user-profile-common';
import type { DataStreamApis } from '../use_data_stream_apis';
import { COPY_URL } from '../use_conversation/translations';
import { useConversation } from '../use_conversation';
import * as i18n from './translations';
import type { Conversation } from '../../..';
import { useAssistantContext } from '../../..';
import { UserProfilesSearch } from './user_profiles_search';

interface Props {
  refetchCurrentConversation: ({ isStreamRefetch }: { isStreamRefetch?: boolean }) => void;
  refetchCurrentUserConversations: DataStreamApis['refetchCurrentUserConversations'];
  selectedConversation: Conversation | undefined;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ShareModalComponent: React.FC<Props> = ({
  refetchCurrentConversation,
  refetchCurrentUserConversations,
  selectedConversation,
  setIsModalOpen,
}) => {
  const { copyConversationUrl, updateConversationUsers } = useConversation();

  const { currentUser } = useAssistantContext();
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
    setNextUsers(conversationUsers);
  }, [currentUser?.id, currentUser?.name, selectedConversation?.users]);
  const handleCopyUrl = useCallback(
    () => copyConversationUrl(selectedConversation),
    [copyConversationUrl, selectedConversation]
  );

  const onNextUsersSelect = useCallback((updatedUsers: UserProfile[]) => {
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
      await refetchCurrentUserConversations();
      refetchCurrentConversation({});
    }
  }, [
    currentUser,
    nextUsers,
    refetchCurrentConversation,
    refetchCurrentUserConversations,
    selectedConversation,
    setIsModalOpen,
    updateConversationUsers,
  ]);

  return (
    <EuiModal onClose={onCancelShare} maxWidth={600} data-test-subj="shareConversationModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle className="eui-textTruncate">
          {`${i18n.SHARE} `} <strong>{selectedConversation?.title}</strong>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <UserProfilesSearch
          onUsersSelect={onNextUsersSelect}
          selectedUsers={nextUsers}
          forbiddenUsers={[...(currentUser?.id ? [currentUser?.id] : [])]}
        />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent={'spaceBetween'}>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="copyConversationUrl"
              iconType="copyClipboard"
              onClick={handleCopyUrl}
            >
              {COPY_URL}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton data-test-subj="shareConversation" onClick={onSaveShare} fill>
              {i18n.DONE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};

export const ShareModal = React.memo(ShareModalComponent);
