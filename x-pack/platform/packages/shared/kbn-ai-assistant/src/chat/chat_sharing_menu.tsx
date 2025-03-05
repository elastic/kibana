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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConversationAccess } from '@kbn/observability-ai-assistant-plugin/public';

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
  disabled,
  onChangeConversationAccess,
}: {
  isPublic: boolean;
  disabled: boolean;
  onChangeConversationAccess: (access: ConversationAccess) => Promise<void>;
}) {
  const { euiTheme } = useEuiTheme();
  const [selectedValue, setSelectedValue] = useState(
    isPublic ? ConversationAccess.SHARED : ConversationAccess.PRIVATE
  );
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

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
      <EuiFlexGroup gutterSize="xs" direction="column" style={{ paddingBlock: euiTheme.size.xs }}>
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
          <EuiIcon type="arrowDown" size="m" style={{ paddingLeft: euiTheme.size.xs }} />
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
        onChange={(newOptions) => {
          const selectedOption = newOptions.find((option) => option.checked === 'on');
          if (selectedOption && selectedOption.key !== selectedValue) {
            setSelectedValue(selectedOption.key as ConversationAccess);
            onChangeConversationAccess(selectedOption.key as ConversationAccess);
          }
          setIsPopoverOpen(false);
        }}
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
