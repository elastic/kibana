/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
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
import { COPY_URL } from '../settings/settings_context_menu/translations';
import * as i18n from './translations';
import { Conversation } from '../../..';
import { UserProfilesSearch } from './user_profiles_search';

interface SharedUser {
  name: string;
  color: string;
}

interface Props {
  selectedConversation: Conversation | undefined;
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
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
  setIsModalOpen,
  selectedConversation,
}) => {
  const [sharingOption, setSharingOption] = useState<'everyone' | 'selected'>('everyone');
  const selectedUsers = useMemo(
    () =>
      selectedConversation?.users.map(({ name, id }) => ({
        // id or name will be defined, empty string is fallback for TS
        uid: id ?? name ?? '',
        enabled: true,
        user: { username: name ?? id ?? '' },
        data: {},
      })) || [],
    [selectedConversation]
  );

  const accessText = useMemo(
    () => (sharingOption === 'everyone' ? i18n.EVERYONE : i18n.ONLY_SELECTED),
    [sharingOption]
  );

  return isModalOpen ? (
    <EuiModal onClose={() => setIsModalOpen(false)} maxWidth={600}>
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
            <UserProfilesSearch onUserSelect={() => {}} selectedUsers={selectedUsers} />
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
        <EuiButton onClick={() => setIsModalOpen(false)} fill>
          {i18n.DONE}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  ) : null;
};

export const ShareModal = React.memo(ShareModalComponent);
