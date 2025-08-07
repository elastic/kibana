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
  EuiText,
  EuiSelectable,
  EuiPopover,
  type EuiSelectableOption,
  EuiBadge,
  useGeneratedHtmlId,
  EuiIcon,
} from '@elastic/eui';
import { EuiSelectableOnChangeEvent } from '@elastic/eui/src/components/selectable/selectable';
import { useConversation } from '../use_conversation';
import { ShareModal } from './share_modal';
import { Conversation, useAssistantContext } from '../../..';
import * as i18n from './translations';

interface Props {
  selectedConversation: Conversation | undefined;
  isConversationOwner: boolean;
  refetchCurrentConversation: ({ isStreamRefetch }: { isStreamRefetch?: boolean }) => void;
}

interface ShareBadgeOptionData {
  description?: string;
}
const ShareBadgeComponent: React.FC<Props> = ({
  isConversationOwner,
  refetchCurrentConversation,
  selectedConversation,
}) => {
  const { updateConversationUsers } = useConversation();
  const { currentUser } = useAssistantContext();
  const { isShared, isSharedGlobal } = useMemo(
    () => ({
      isShared: selectedConversation?.users.length !== 1,
      isSharedGlobal: selectedConversation?.users.length === 0,
    }),
    [selectedConversation?.users]
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const items = useMemo<Array<EuiSelectableOption<ShareBadgeOptionData>>>(
    () => [
      {
        checked: !isShared ? 'on' : undefined,
        key: 'not-shared',
        data: {
          description: i18n.ONLY_VISIBLE_TO_YOU,
        },
        'data-test-subj': 'notShared',
        disabled: !isConversationOwner,
        label: i18n.NOT_SHARED,
        isGroupLabel: false,
      },
      {
        checked: isShared ? 'on' : undefined,
        key: 'shared',
        data: {
          description: isSharedGlobal ? i18n.VISIBLE_GLOBAL : i18n.VISIBLE_SELECTED,
        },
        'data-test-subj': 'shared',
        disabled: !isConversationOwner,
        label: i18n.SHARED,
        isGroupLabel: false,
      },
    ],
    [isConversationOwner, isShared, isSharedGlobal]
  );

  const unshareConversation = useCallback(async () => {
    if (currentUser && selectedConversation && selectedConversation.id !== '') {
      await updateConversationUsers({
        conversationId: selectedConversation.id,
        updatedUsers: [{ id: currentUser.id, name: currentUser.name }],
      });
      refetchCurrentConversation({});
    }
  }, [currentUser, refetchCurrentConversation, selectedConversation, updateConversationUsers]);

  const onSharedChange = useCallback<
    (
      options: Array<EuiSelectableOption<ShareBadgeOptionData>>,
      event: EuiSelectableOnChangeEvent,
      changedOption: EuiSelectableOption<ShareBadgeOptionData>
    ) => void
  >(
    (_options, _event, selectedOption) => {
      if (selectedOption.key === 'not-shared') {
        if (isShared) unshareConversation();
      } else {
        setIsModalOpen(true);
      }
      setIsPopoverOpen(false);
    },
    [isShared, unshareConversation]
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
  const button = useMemo(
    () => (
      <EuiBadge
        aria-label={i18n.VISIBILITY}
        color="hollow"
        data-test-subj="shareBadgeButton"
        isDisabled={!isConversationOwner}
        iconType="arrowDown"
        iconSide="right"
        onClick={togglePopover}
        onClickAriaLabel={i18n.SELECT_VISIBILITY_ARIA_LABEL}
      >
        <EuiIcon
          type={isShared ? 'users' : 'lock'}
          size="s"
          css={css`
            margin-right: 4px;
          `}
        />{' '}
        {selectedLabel}
      </EuiBadge>
    ),
    [isConversationOwner, togglePopover, isShared, selectedLabel]
  );

  const renderOption = useCallback(
    (option: EuiSelectableOption<ShareBadgeOptionData>) => (
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

  const showGlobalModalOnOpen = useMemo(
    // if the conversation is private opening sharing modal for the first time, default it to global view
    () => !isShared || isSharedGlobal,
    [isShared, isSharedGlobal]
  );

  return (
    <>
      <EuiPopover
        button={button}
        closePopover={closePopover}
        data-test-subj="shareBadgePopover"
        id={filterGroupPopoverId}
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
      >
        <EuiSelectable
          aria-label={i18n.VISIBILITY}
          data-test-subj="shareBadge"
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
          isSharedGlobal={showGlobalModalOnOpen}
          selectedConversation={selectedConversation}
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          refetchCurrentConversation={refetchCurrentConversation}
        />
      )}
    </>
  );
};

export const ShareBadge = React.memo(ShareBadgeComponent);
