/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButtonGroup,
  EuiSpacer,
  EuiText,
  EuiToken,
  EuiCopy,
} from '@elastic/eui';
import { Conversation } from '../../..';

interface SharedUser {
  name: string;
  color: string;
}

interface Props {
  selectedConversation: Conversation | undefined;
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ShareModalComponent: React.FC<Props> = ({
  isModalOpen,
  setIsModalOpen,
  selectedConversation,
}) => {
  const [sharingOption, setSharingOption] = useState<'everyone' | 'selected'>('everyone');
  const [userInput, setUserInput] = useState('');
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([
    { name: 'User A', color: 'tint1' },
    { name: 'User B', color: 'tint3' },
  ]);

  const shareOptions = [
    {
      id: 'everyone',
      label: 'With everyone',
      iconType: 'globe',
    },
    {
      id: 'selected',
      label: 'Only with selected users',
      iconType: 'user',
    },
  ];

  const onAddUser = () => {
    const trimmed = userInput.trim();
    if (trimmed && !sharedUsers.find((u) => u.name === trimmed)) {
      const nextColor = `tint${(sharedUsers.length % 9) + 1}`;
      setSharedUsers([...sharedUsers, { name: trimmed, color: nextColor }]);
      setUserInput('');
    }
  };

  const onRemoveUser = (name: string) => {
    setSharedUsers(sharedUsers.filter((u) => u.name !== name));
  };

  const getAccessText = () => {
    return sharingOption === 'everyone'
      ? 'All team members in your workspace can view the conversation.'
      : 'Only selected team members can view this conversation.';
  };

  return isModalOpen ? (
    <EuiModal onClose={() => setIsModalOpen(false)} maxWidth={600}>
      <EuiModalHeader>
        <EuiModalHeaderTitle className="eui-textTruncate">
          {'Share '} <strong>{selectedConversation?.title}</strong>
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
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFieldText
                  placeholder="Add a name or email address"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  fullWidth
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={onAddUser}>Add</EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            {sharedUsers.map((user) => (
              <EuiFlexGroup key={user.name} alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiToken iconType="user" color={user.color} shape="circle" />
                </EuiFlexItem>
                <EuiFlexItem>{user.name}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="minusInCircle"
                    color="danger"
                    onClick={() => onRemoveUser(user.name)}
                    aria-label={`Remove ${user.name}`}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            ))}

            <EuiSpacer />
          </>
        )}

        <EuiText size="s">
          <strong>Who has access</strong>
          <p>{getAccessText()}</p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiCopy textToCopy="https://your.app/share-link">
          {(copy) => (
            <EuiButton iconType="copyClipboard" onClick={copy}>
              Copy URL
            </EuiButton>
          )}
        </EuiCopy>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton onClick={() => setIsModalOpen(false)} fill>
          Done
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  ) : null;
};

export const ShareModal = React.memo(ShareModalComponent);
