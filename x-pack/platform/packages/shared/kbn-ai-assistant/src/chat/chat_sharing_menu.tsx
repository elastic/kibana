/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiPopover,
  EuiBadge,
  EuiSelectable,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelectableOption,
  EuiIcon,
  useEuiTheme,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConversationAccess } from '@kbn/observability-ai-assistant-plugin/public';
import { css } from '@emotion/css';

const iconOnlyBadgeStyle = css`
  .euiBadge__icon {
    width: 12px;
    height: 12px;
  }

  padding: 0px 6px;
  line-height: 1;
`;

interface OptionData {
  description?: string;
}

const privateLabel = i18n.translate('xpack.aiAssistant.chatHeader.shareOptions.private', {
  defaultMessage: 'Private',
});

const sharedLabel = i18n.translate('xpack.aiAssistant.chatHeader.shareOptions.shared', {
  defaultMessage: 'Shared',
});

export function ChatSharingMenu({
  isPublic,
  isArchived,
  disabled,
  onChangeConversationAccess,
}: {
  isPublic: boolean;
  isArchived: boolean;
  disabled: boolean;
  onChangeConversationAccess: (access: ConversationAccess) => Promise<void>;
}) {
  const { euiTheme } = useEuiTheme();
  const [selectedValue, setSelectedValue] = useState(
    isPublic ? ConversationAccess.SHARED : ConversationAccess.PRIVATE
  );
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [previousValue, setPreviousValue] = useState(selectedValue);
  const [isLoading, setIsLoading] = useState(false);

  const options: Array<EuiSelectableOption<OptionData>> = [
    {
      key: ConversationAccess.PRIVATE,
      label: privateLabel,
      checked: !selectedValue || selectedValue === ConversationAccess.PRIVATE ? 'on' : undefined,
      description: i18n.translate('xpack.aiAssistant.chatHeader.shareOptions.privateDescription', {
        defaultMessage: 'This conversation is only visible to you.',
      }),
      'data-test-subj': 'observabilityAiAssistantChatPrivateOption',
    },
    {
      key: ConversationAccess.SHARED,
      label: sharedLabel,
      checked: selectedValue === ConversationAccess.SHARED ? 'on' : undefined,
      description: i18n.translate('xpack.aiAssistant.chatHeader.shareOptions.sharedDescription', {
        defaultMessage: 'Team members can view this conversation.',
      }),
      'data-test-subj': 'observabilityAiAssistantChatSharedOption',
    },
  ];

  const renderOption = useCallback(
    (option: EuiSelectableOption<OptionData>) => (
      <EuiFlexGroup gutterSize="xs" direction="column" css={{ paddingBlock: euiTheme.size.xs }}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{option.label}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">{option.description}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [euiTheme.size.xs]
  );

  const handleChange = async (newOptions: EuiSelectableOption[]) => {
    const selectedOption = newOptions.find((option) => option.checked === 'on');

    if (selectedOption && selectedOption.key !== selectedValue) {
      setPreviousValue(selectedValue);
      setSelectedValue(selectedOption.key as ConversationAccess);
      setIsLoading(true);

      try {
        await onChangeConversationAccess(selectedOption.key as ConversationAccess);
      } catch (err) {
        setSelectedValue(previousValue);
      }

      setIsLoading(false);
      setIsPopoverOpen(false);
    }
  };

  if (isLoading) {
    return (
      <EuiBadge
        color="default"
        data-test-subj="observabilityAiAssistantChatAccessLoadingBadge"
        className={css`
          min-width: ${euiTheme.size.xxxxl};
          display: flex;
          justify-content: center;
        `}
      >
        <EuiLoadingSpinner size="s" />
      </EuiBadge>
    );
  }

  if (isArchived) {
    return (
      <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center" wrap={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge
            iconType={selectedValue === ConversationAccess.SHARED ? 'users' : 'lock'}
            color="hollow"
            className={iconOnlyBadgeStyle}
            data-test-subj="observabilityAiAssistantChatAccessBadge"
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiBadge
            iconType="folderOpen"
            color="default"
            data-test-subj="observabilityAiAssistantArchivedBadge"
          >
            {i18n.translate('xpack.aiAssistant.chatHeader.archivedBadge', {
              defaultMessage: 'Archived',
            })}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (disabled) {
    return (
      <EuiBadge
        iconType={selectedValue === ConversationAccess.SHARED ? 'users' : 'lock'}
        color="default"
        data-test-subj="observabilityAiAssistantChatAccessBadge"
      >
        {selectedValue === ConversationAccess.SHARED ? sharedLabel : privateLabel}
      </EuiBadge>
    );
  }

  return (
    <EuiPopover
      button={
        <EuiBadge
          iconType={selectedValue === ConversationAccess.SHARED ? 'users' : 'lock'}
          color="hollow"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          onClickAriaLabel={i18n.translate(
            'xpack.aiAssistant.chatHeader.shareOptions.toggleOptionsBadge',
            {
              defaultMessage: 'Toggle sharing options',
            }
          )}
          data-test-subj="observabilityAiAssistantChatAccessBadge"
        >
          {selectedValue === ConversationAccess.SHARED ? sharedLabel : privateLabel}
          <EuiIcon type="arrowDown" size="m" css={{ paddingLeft: euiTheme.size.xs }} />
        </EuiBadge>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downCenter"
    >
      <EuiSelectable
        aria-label={i18n.translate('xpack.aiAssistant.chatHeader.shareOptions.options', {
          defaultMessage: 'Sharing options',
        })}
        options={options}
        singleSelection="always"
        renderOption={renderOption}
        onChange={handleChange}
        listProps={{
          isVirtualized: false,
          onFocusBadge: false,
          textWrap: 'wrap',
        }}
      >
        {(list) => <div style={{ width: 250 }}>{list}</div>}
      </EuiSelectable>
    </EuiPopover>
  );
}
