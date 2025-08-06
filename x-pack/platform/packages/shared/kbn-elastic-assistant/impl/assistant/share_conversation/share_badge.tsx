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
import { ShareModal } from './share_modal';
import { Conversation } from '../../..';
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
  const isShared = useMemo(
    () => selectedConversation?.users.length !== 1,
    [selectedConversation?.users]
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const items = useMemo<Array<EuiSelectableOption<ShareBadgeOptionData>>>(
    () => [
      {
        checked: !isShared ? 'on' : undefined,
        data: {
          description: i18n.ONLY_VISIBLE_TO_YOU,
        },
        'data-test-subj': 'notShared',
        disabled: !isConversationOwner,
        label: i18n.PRIVATE,
      },
      {
        checked: isShared ? 'on' : undefined,
        data: {
          description: i18n.VISIBLE_TO_YOUR_TEAM,
        },
        'data-test-subj': 'shared',
        disabled: !isConversationOwner,
        label: i18n.SHARED,
      },
    ],
    [isConversationOwner, isShared]
  );
  const onSharedChange = () => {
    console.log('change');
    setIsModalOpen(true);
    setIsPopoverOpen(false);
  };
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
    [isShared, togglePopover, selectedLabel]
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
