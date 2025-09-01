/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelectable,
  type EuiSelectableOption,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiSelectableOnChangeEvent } from '@elastic/eui/src/components/selectable/selectable';
import { ConversationSharedState } from '@kbn/elastic-assistant-common';
import type { DataStreamApis } from '../use_data_stream_apis';
import { useConversation } from '../use_conversation';
import { ShareModal } from './share_modal';
import { ShareBadge } from './share_badge';
import type { Conversation } from '../../..';
import { useAssistantContext } from '../../..';
import * as i18n from './translations';

interface Props {
  conversationSharedState: ConversationSharedState;
  selectedConversation: Conversation | undefined;
  isConversationOwner: boolean;
  refetchCurrentUserConversations: DataStreamApis['refetchCurrentUserConversations'];
  refetchCurrentConversation: ({ isStreamRefetch }: { isStreamRefetch?: boolean }) => void;
}

interface ShareSelectModalOptionData {
  description?: string;
}
const ShareSelectModalComponent: React.FC<Props> = ({
  conversationSharedState,
  isConversationOwner,
  refetchCurrentConversation,
  refetchCurrentUserConversations,
  selectedConversation,
}) => {
  const { updateConversationUsers } = useConversation();
  const { currentUser, toasts } = useAssistantContext();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const items = useMemo<Array<EuiSelectableOption<ShareSelectModalOptionData>>>(
    () => [
      {
        checked: conversationSharedState === ConversationSharedState.PRIVATE ? 'on' : undefined,
        key: ConversationSharedState.PRIVATE,
        data: {
          description: i18n.VISIBLE_PRIVATE,
        },
        'data-test-subj': ConversationSharedState.PRIVATE,
        label: i18n.PRIVATE,
        isGroupLabel: false,
      },
      {
        checked: conversationSharedState === ConversationSharedState.SHARED ? 'on' : undefined,
        key: ConversationSharedState.SHARED,
        data: {
          description: i18n.VISIBLE_SHARED,
        },
        'data-test-subj': ConversationSharedState.SHARED,
        label: i18n.SHARED,
        isGroupLabel: false,
      },
      {
        checked: conversationSharedState === ConversationSharedState.RESTRICTED ? 'on' : undefined,
        key: ConversationSharedState.RESTRICTED,
        data: {
          description: i18n.VISIBLE_RESTRICTED,
        },
        'data-test-subj': ConversationSharedState.RESTRICTED,
        label: i18n.RESTRICTED,
        isGroupLabel: false,
      },
    ],
    [conversationSharedState]
  );

  const unshareConversation = useCallback(async () => {
    try {
      if (currentUser && selectedConversation && selectedConversation.id !== '') {
        await updateConversationUsers({
          conversationId: selectedConversation.id,
          updatedUsers: [{ id: currentUser.id, name: currentUser.name }],
        });
        await refetchCurrentUserConversations();
        refetchCurrentConversation({});
        toasts?.addSuccess({
          title: i18n.PRIVATE_SUCCESS,
        });
      }
    } catch (error) {
      toasts?.addError(error, {
        title: i18n.PRIVATE_ERROR,
      });
    }
  }, [
    currentUser,
    refetchCurrentConversation,
    refetchCurrentUserConversations,
    selectedConversation,
    toasts,
    updateConversationUsers,
  ]);

  const shareConversationGlobal = useCallback(async () => {
    try {
      if (selectedConversation && selectedConversation.id !== '') {
        await updateConversationUsers({
          conversationId: selectedConversation.id,
          updatedUsers: [],
        });
        await refetchCurrentUserConversations();
        refetchCurrentConversation({});
        toasts?.addSuccess({
          title: i18n.SHARED_SUCCESS,
        });
      } else {
        throw new Error('No conversation available to share globally');
      }
    } catch (error) {
      toasts?.addError(error, {
        title: i18n.SHARED_ERROR,
      });
    }
  }, [
    refetchCurrentConversation,
    refetchCurrentUserConversations,
    selectedConversation,
    toasts,
    updateConversationUsers,
  ]);

  const onSharedChange = useCallback<
    (
      options: Array<EuiSelectableOption<ShareSelectModalOptionData>>,
      event: EuiSelectableOnChangeEvent,
      changedOption: EuiSelectableOption<ShareSelectModalOptionData>
    ) => void
  >(
    (_options, _event, selectedOption) => {
      if (
        selectedOption.key === ConversationSharedState.PRIVATE &&
        conversationSharedState !== ConversationSharedState.PRIVATE
      ) {
        unshareConversation();
      } else if (
        selectedOption.key === ConversationSharedState.SHARED &&
        conversationSharedState !== ConversationSharedState.SHARED
      ) {
        shareConversationGlobal();
      } else if (selectedOption.key === ConversationSharedState.RESTRICTED) {
        setIsModalOpen(true);
      }
      setIsPopoverOpen(false);
    },
    [conversationSharedState, shareConversationGlobal, unshareConversation]
  );

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => {
    setIsPopoverOpen((isOpen) => !isOpen);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const filterGroupPopoverId = useGeneratedHtmlId({
    prefix: 'visibilityFilterGroupPopover',
  });
  const selectedLabel = useMemo(() => {
    const firstSelected = items.find((item) => item.checked === 'on');

    return firstSelected != null ? firstSelected.label : items[0].label;
  }, [items]);

  const renderOption = useCallback(
    (option: EuiSelectableOption<ShareSelectModalOptionData>) => (
      <EuiFlexGroup direction="column" gutterSize="none" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiText
            css={css`
              font-weight: bold;
            `}
            data-test-subj="optionLabel"
            size="s"
          >
            {option.label}
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText
            css={css`
              text-wrap: pretty;
            `}
            data-test-subj="optionDescription"
            size="s"
          >
            {option.description}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  return (
    <>
      <EuiPopover
        button={
          <ShareBadge
            conversationSharedState={conversationSharedState}
            isConversationOwner={isConversationOwner}
            isDropdown
            label={selectedLabel}
            onClick={togglePopover}
          />
        }
        closePopover={closePopover}
        data-test-subj="shareBadgePopover"
        id={filterGroupPopoverId}
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
      >
        <EuiSelectable
          aria-label={i18n.VISIBILITY}
          data-test-subj="shareSelect"
          listProps={{
            isVirtualized: false,
            rowHeight: 60,
          }}
          options={items}
          onChange={onSharedChange}
          renderOption={renderOption}
          singleSelection={true}
        >
          {(list) => (
            <div
              css={css`
                width: 230px;
              `}
            >
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
      {isModalOpen && (
        <ShareModal
          refetchCurrentConversation={refetchCurrentConversation}
          refetchCurrentUserConversations={refetchCurrentUserConversations}
          selectedConversation={selectedConversation}
          setIsModalOpen={setIsModalOpen}
        />
      )}
    </>
  );
};

export const ShareSelectModal = React.memo(ShareSelectModalComponent);
